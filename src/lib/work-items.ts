type SortableWorkItem = {
  status: string;
  due_at?: string | null;
  created_at?: string | null;
};

function dueTimestamp(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

export function sortWorkItems<T extends SortableWorkItem>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftRank = left.status === "done" ? 1 : 0;
    const rightRank = right.status === "done" ? 1 : 0;
    if (leftRank !== rightRank) return leftRank - rightRank;

    const dueDifference = dueTimestamp(left.due_at) - dueTimestamp(right.due_at);
    if (dueDifference !== 0) return dueDifference;

    return Date.parse(right.created_at || "") - Date.parse(left.created_at || "");
  });
}

export function isWorkItemOverdue(item: SortableWorkItem, now = new Date()) {
  const due = dueTimestamp(item.due_at);
  return item.status !== "done" && due !== Number.POSITIVE_INFINITY && due < now.getTime();
}
