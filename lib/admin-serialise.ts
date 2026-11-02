import "server-only";

/**
 * Convert Firestore Timestamp / Date-like values into a plain epoch-millisecond
 * number before a record crosses a Server Component -> Client Component or API
 * JSON boundary. Firebase Admin Timestamp instances are class objects and React
 * Server Components reject them as props.
 */
export function adminTimeMillis(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (value instanceof Date) {
    const millis = value.getTime();
    return Number.isFinite(millis) ? millis : undefined;
  }

  const candidate = value as {
    toMillis?: () => number;
    toDate?: () => Date;
    _seconds?: number;
    seconds?: number;
  };

  try {
    if (typeof candidate.toMillis === "function") {
      const millis = candidate.toMillis();
      return Number.isFinite(millis) ? millis : undefined;
    }
  } catch {
    // Continue with the remaining safe fallbacks.
  }

  try {
    if (typeof candidate.toDate === "function") {
      const millis = candidate.toDate().getTime();
      return Number.isFinite(millis) ? millis : undefined;
    }
  } catch {
    // Continue with the remaining safe fallbacks.
  }

  const seconds = typeof candidate.seconds === "number"
    ? candidate.seconds
    : typeof candidate._seconds === "number"
      ? candidate._seconds
      : undefined;
  return typeof seconds === "number" && Number.isFinite(seconds) ? seconds * 1000 : undefined;
}


/**
 * Deeply convert data returned by Firebase Admin / Firestore into values that
 * React Server Components can safely pass to Client Components.
 *
 * This is intentionally applied again at the page boundary even when the
 * individual repository loader already normalises its known timestamp fields.
 * That gives the Admin workspace a single last-line-of-defence against future
 * Firestore Timestamp, DocumentReference, GeoPoint or other SDK class objects
 * leaking into client props.
 */
export function adminClientSafe<T>(value: T): T {
  const active = new WeakSet<object>();

  const walk = (input: unknown): unknown => {
    if (input == null || typeof input === "string" || typeof input === "number" || typeof input === "boolean") {
      return input;
    }
    if (typeof input === "bigint") return Number(input);
    if (typeof input === "undefined" || typeof input === "function" || typeof input === "symbol") return undefined;

    if (input instanceof Date) return input.getTime();

    if (Array.isArray(input)) {
      if (active.has(input)) return undefined;
      active.add(input);
      const output = input.map(walk).filter((item) => item !== undefined);
      active.delete(input);
      return output;
    }

    if (typeof input === "object") {
      const objectValue = input as Record<string, unknown> & {
        toMillis?: () => number;
        toDate?: () => Date;
        _seconds?: number;
        seconds?: number;
        _nanoseconds?: number;
        nanoseconds?: number;
      };

      try {
        if (typeof objectValue.toMillis === "function") {
          const millis = objectValue.toMillis();
          if (Number.isFinite(millis)) return millis;
        }
      } catch {
        // Fall through to the remaining safe representations.
      }

      try {
        if (typeof objectValue.toDate === "function") {
          const millis = objectValue.toDate().getTime();
          if (Number.isFinite(millis)) return millis;
        }
      } catch {
        // Fall through to the remaining safe representations.
      }

      const seconds = typeof objectValue.seconds === "number"
        ? objectValue.seconds
        : typeof objectValue._seconds === "number"
          ? objectValue._seconds
          : undefined;
      if (typeof seconds === "number" && Number.isFinite(seconds)) {
        const nanos = typeof objectValue.nanoseconds === "number"
          ? objectValue.nanoseconds
          : typeof objectValue._nanoseconds === "number"
            ? objectValue._nanoseconds
            : 0;
        return seconds * 1000 + Math.floor((Number.isFinite(nanos) ? nanos : 0) / 1_000_000);
      }

      if (active.has(input as object)) return undefined;
      active.add(input as object);

      const output: Record<string, unknown> = {};
      for (const [key, nested] of Object.entries(objectValue)) {
        const safe = walk(nested);
        if (safe !== undefined) output[key] = safe;
      }
      active.delete(input as object);
      return output;
    }

    return input;
  };

  return walk(value) as T;
}
