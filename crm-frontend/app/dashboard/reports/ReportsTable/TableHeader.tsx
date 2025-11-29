import { columnDefs } from "./utils/columnDefs";

export default function TableHeader({
  visible,
  sortField,
  sortDir,
  onSort,
}: {
  visible: Record<string, boolean>;
  sortField: string;
  sortDir: "asc" | "desc";
  onSort: (field: string) => void;
}) {
  return (
    <thead className="bg-gray-100 sticky top-0 z-20">
      <tr>
        {/* Sticky checkbox column */}
        <th className="border border-gray-700 font-semibold px-2 py-1 sticky left-0 z-30 bg-gray-100"></th>

        {columnDefs.map((col) =>
          visible[col.key] ? (
            <th
              key={col.key}
              className="border px-2 py-1 font-semibold select-none cursor-pointer hover:bg-gray-200"
              onClick={() => onSort(col.key)}
            >
              <div className="flex items-center justify-between gap-2">
                <span>{col.label}</span>

                {/* SORT ICON */}
                {sortField === col.key ? (
                  sortDir === "asc" ? (
                    <span className="text-xs">▲</span>
                  ) : (
                    <span className="text-xs">▼</span>
                  )
                ) : (
                  <span className="text-xs text-gray-300">↕</span>
                )}
              </div>
            </th>
          ) : null
        )}
      </tr>
    </thead>
  );
}