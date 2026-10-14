'use client';
// @ts-nocheck
import * as View from '@/admin/views/TaskBoard';
const TaskBoard = View.default || View.TaskBoard || View[Object.keys(View)[0]];

export default function Page() {
  return <TaskBoard />;
}
