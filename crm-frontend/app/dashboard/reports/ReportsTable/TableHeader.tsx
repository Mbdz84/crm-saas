import { columnDefs } from "./utils/columnDefs";

export default function TableHeader({
  visible,
  sortField,
  sortDir,
  onSort,
  allSelected,
  onToggleAll,
}: {
  visible: Record<string, boolean>;
  sortField: string;
  sortDir: "asc" | "desc";
  onSort: (field: string) => void;
  allSelected: boolean;
  onToggleAll: () => void;
}) {
  return (
    <thead className="bg-gray-100 sticky top-0 z-20">
      <tr>
        {/* Sticky checkbox column */}
        <th className="border border-gray-700 font-semibold w-6 p-0 sticky left-0 z-30 bg-gray-100 text-center">
          <input
            type="checkbox"
            className="h-5 w-5 m-0 block mx-auto cursor-pointer"
            checked={allSelected}
            onChange={onToggleAll}
          />
        </th>

        {columnDefs.map((col) =>
          visible[col.key] ? (
            <th
              key={col.key}
              className="border px-2 py-1 text-xs font-semibold select-none cursor-pointer hover:bg-gray-200"
              onClick={() => onSort(col.key)}
            >
              <div className="flex items-center justify-between gap-1">
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