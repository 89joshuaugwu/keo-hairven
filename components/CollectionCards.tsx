import Image from "next/image";
import Link from "next/link";
import { hairCollections } from "@/lib/collections";

export function CollectionCards({ full = false }: { full?: boolean }) {
  return <div className={`edit-grid ${full ? "edit-grid-full" : ""}`}>
    {hairCollections.map((collection) => <Link className="edit-card" href={`/products?category=${collection.slug}`} key={collection.slug}>
      <div className="edit-card-image">
        <Image src={collection.image} alt={`${collection.title} — editorial style inspiration`} fill sizes={full ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 50vw, 25vw"} style={{ objectFit: "cover", objectPosition: collection.position }} />
        <span className="edit-card-action" aria-hidden="true">↗</span>
        <span className="edit-card-hint">Explore collection</span>
      </div>
      <div className="edit-card-label"><h3>{collection.title}</h3><span aria-hidden="true">↗</span></div>
      <p>{collection.description}</p>
    </Link>)}
  </div>;
}
