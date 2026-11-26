import { productNow } from '@/lib/product-time';
import type { BoardResponse, TaskCounts, WorkTask } from '@/types/work';

export interface BoardMove {
  taskId: number;
  columnId: number;
  beforeTaskId: number | null;
}

function moveCounts(counts: TaskCounts, from: WorkTask['status'], to?: WorkTask['status']): TaskCounts {
  return {
    totalTasks: counts.totalTasks - Number(to === undefined),
    nonCancelledTasks: counts.nonCancelledTasks + Number(to !== undefined && to !== 'CANCELLED') - Number(from !== 'CANCELLED'),
    cancelledTasks: counts.cancelledTasks + Number(to === 'CANCELLED') - Number(from === 'CANCELLED'),
    completedTasks: counts.completedTasks + Number(to === 'CONCLUDED') - Number(from === 'CONCLUDED'),
  };
}

export function applyBoardMove(board: BoardResponse, move: BoardMove, confirmed?: { task: WorkTask; hidden: boolean }): BoardResponse {
  const task = board.tasks.find(row => row.id === move.taskId);
  const column = board.columns.find(row => row.id === move.columnId);
  if (!task || !column) return board;

  const tasks = board.tasks.filter(row => row.id !== task.id);
  const target = move.beforeTaskId === null
    ? tasks.length
    : tasks.findIndex(row => row.id === move.beforeTaskId && row.columnId === column.id);
  if (target < 0) return board;

  const moved = confirmed?.task ?? {
    ...task,
    column,
    columnId: column.id,
    status: column.kind,
    completedAt: column.kind === 'CONCLUDED' ? task.completedAt ?? productNow().date : null,
  };
  if (!confirmed?.hidden) tasks.splice(target, 0, moved);
  return {
    ...board,
    projectVersion: confirmed?.task.project?.version ?? board.projectVersion,
    tasks,
    columns: board.columns.map(row => {
      const delta = Number(row.id === column.id) - Number(row.id === task.columnId);
      const visibleDelta = Number(!confirmed?.hidden && row.id === column.id) - Number(row.id === task.columnId);
      return delta === 0 && visibleDelta === 0 ? row : {
        ...row, totalCount: row.totalCount + delta, visibleCount: row.visibleCount + visibleDelta,
      };
    }),
    total: moveCounts(board.total, task.status, moved.status),
    visible: moveCounts(board.visible, task.status, confirmed?.hidden ? undefined : moved.status),
  };
}
