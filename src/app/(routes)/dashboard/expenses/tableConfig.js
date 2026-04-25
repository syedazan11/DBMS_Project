export const columns = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <div>{row.getValue("name") || "-"}</div>,
  },
  {
    accessorKey: "expense",
    header: "Amount Spent",
    cell: ({ row }) => <div>{row.getValue("expense") || "-"}</div>,
  },
  {
    accessorKey: "budget",
    header: "Spent On",
    cell: ({ row }) => (
      <div>
        {row.original.Icon} {row.original.budgetName || "-"}
      </div>
    ),
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => {
      const tags = Array.isArray(row.original.tags) ? row.original.tags : [];
      if (tags.length === 0) return <div>-</div>;

      return (
        <div className="flex flex-wrap gap-1 max-w-[220px]">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="text-[10px] md:text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: (tag.color || "#4845d2") + "20",
                color: tag.color || "#4845d2",
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      const createdAt = row.getValue("createdAt");
      return (
        <div>
          {createdAt
            ? `${new Date(createdAt).toLocaleDateString()} at ${new Date(
                createdAt
              ).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : "-"}
        </div>
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Updated At",
    cell: ({ row }) => {
      const updatedAt = row.getValue("updatedAt");
      return (
        <div>
          {updatedAt
            ? `${new Date(updatedAt).toLocaleDateString()} at ${new Date(
                updatedAt
              ).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : "-"}
        </div>
      );
    },
  },
];
