"use client";
export default function ErrorPage({ reset }: {
    reset: () => void;
}) { return <div role="alert"><p>Categories could not be loaded.</p><button onClick={reset}>Try again</button></div>; }
