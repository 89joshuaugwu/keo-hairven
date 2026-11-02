import { AdminTrashClient } from "@/components/AdminTrashClient";
import { getTrashRecords } from "@/lib/trash-server";
export const dynamic = "force-dynamic";
export default async function TrashPage() { return <AdminTrashClient initial={await getTrashRecords() as any}/>; }
