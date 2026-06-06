import { useParams } from "wouter";
import TableCart from "./TableCart";

// URL: /table/:restaurantSlug/:tableNumber
// e.g. /table/embeltoresport/5  or  /table/hajde-grill/3
export default function TablePage() {
  const params = useParams<{ restaurantSlug: string; tableNumber: string }>();
  const restaurantSlug = params.restaurantSlug || "";
  const tableNumber = parseInt(params.tableNumber || "1");

  if (!restaurantSlug || isNaN(tableNumber)) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FAFAF8]">
        <p className="text-black/40 text-sm">Invalid table URL</p>
      </div>
    );
  }

  return (
    <TableCart restaurantSlug={restaurantSlug} tableNumber={tableNumber} />
  );
}
