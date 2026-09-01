'use client';
// @ts-nocheck
import { useEffect, useState } from 'react';
import { AlertCircle, Calendar, ClipboardList, Plus, UserRound, Users, Check, Loader2 } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Modal } from './Modal';
import { Button } from './Button';
import { cn } from '../lib/utils';
import './CreateTaskOverlay.css';

const ROLE_OPTIONS = ['Admin', 'Moderator', 'Call Team', 'Courier Team', 'Factory Team'];
const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High', color: 'text-rose-600 border-rose-500/30 bg-rose-500/10' },
  { value: 'medium', label: 'Medium', color: 'text-amber-600 border-amber-500/30 bg-amber-500/10' },
  { value: 'low', label: 'Low', color: 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10' },
];

export const CreateTaskOverlay = ({ isOpen, onClose, defaultType = 'daily' }) => {
  const { createDailyTask, createAssignedTask } = useTasks();
  const { isAdmin } = useAuth();
  const resolvedDefaultType = isAdmin ? defaultType : 'daily';

  const [allUsers, setAllUsers] = useState([]);
  const [taskType, setTaskType] = useState(defaultType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [assignedRole, setAssignedRole] = useState('Moderator');
  const [assignedTo, setAssignedTo] = useState('');
  const [relatedOrderId, setRelatedOrderId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name, email, avatar_url')
        .order('name', { ascending: true });

      setAllUsers(data || []);
    };

    if (isOpen) {
      setTaskType(resolvedDefaultType);
    }

    if (isAdmin && isOpen) {
      fetchUsers();
    }
  }, [defaultType, isAdmin, isOpen, resolvedDefaultType]);

  const resetForm = () => {
    setTaskType(resolvedDefaultType);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setAssignedRole('Moderator');
    setAssignedTo('');
    setRelatedOrderId('');
    setIsSaving(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!title.trim() || isSaving) return;
    if (taskType === 'assigned' && !assignedTo) return;

    setIsSaving(true);

    try {
      if (taskType === 'assigned') {
        const selectedUser = allUsers.find((user) => user.id === assignedTo);

        await createAssignedTask({
          title: title.trim(),
          description: description.trim(),
          assigned_to: assignedTo,
          assigned_to_name: selectedUser?.name || '',
          priority,
          due_date: dueDate || null,
          related_order_id: relatedOrderId.trim() || null,
        });
      } else {
        await createDailyTask({
          title: title.trim(),
          description: description.trim(),
          assigned_role: assignedRole,
          priority,
          recurrence: 'daily',
        });
      }

      handleClose();
    } catch (error) {
      console.error('Failed to create task:', error);
      setIsSaving(false);
    }
  };

  const isAssignedTask = taskType === 'assigned';
  const selectedUser = allUsers.find((user) => user.id === assignedTo);
  const submitDisabled = !title.trim() || isSaving || (isAssignedTask && !assignedTo);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Task"
      subtitle="A clean composer for assigning work without leaving the board."
      size="3xl"
      className="max-w-4xl xl:max-w-5xl w-full"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode Switch Tabs */}
        {isAdmin && (
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl w-fit border border-border/60">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                taskType === 'daily'
                  ? "bg-card text-foreground shadow-2xs border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTaskType('daily')}
            >
              <Users size={14} />
              <span>Role Task</span>
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                taskType === 'assigned'
                  ? "bg-card text-foreground shadow-2xs border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTaskType('assigned')}
            >
              <UserRound size={14} />
              <span>Person Task</span>
            </button>
          </div>
        )}

        {/* 2-Column Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5">
          
          {/* Left Column: Task Brief Form */}
          <div className="md:col-span-7 p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-4 min-w-0">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary font-sans block">
                Task brief
              </span>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Define the work clearly
              </h3>
            </div>

            {/* Task Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground block">
                Task title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Write a clear outcome..."
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground block">
                Description
              </label>
              <textarea
                className="w-full p-3 rounded-xl border border-input bg-background text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                placeholder="Add the context, expected result, or blockers..."
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            {/* Due Date & Priority Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Due Date */}
              <div className="p-3 rounded-xl border border-border bg-secondary/30 space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Calendar size={13} className="text-primary" />
                  <span>Due date</span>
                </span>
                <input
                  type="date"
                  className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </div>

              {/* Priority */}
              <div className="p-3 rounded-xl border border-border bg-secondary/30 space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle size={13} className="text-amber-500" />
                  <span>Priority</span>
                </span>
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50">
                  {PRIORITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "flex-1 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer text-center",
                        priority === option.value
                          ? cn("bg-card shadow-2xs border border-border/50", option.color)
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setPriority(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Related Order ID (Optional for assigned task) */}
            {isAssignedTask && (
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-muted-foreground block">
                  Related order ID (Optional)
                </label>
                <input
                  type="text"
                  className="w-full h-9 px-3 rounded-xl border border-input bg-background text-xs font-mono font-medium text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. ORD-10023"
                  value={relatedOrderId}
                  onChange={(event) => setRelatedOrderId(event.target.value)}
                />
              </div>
            )}
          </div>

          {/* Right Column: Assignment & Selection */}
          <div className="md:col-span-5 p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-3.5 flex flex-col min-w-0">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary font-sans block">
                Assignment
              </span>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                {isAssignedTask ? 'Choose a teammate' : 'Choose a role'}
              </h3>
            </div>

            {/* Active Selection Callout */}
            <div className="p-3 rounded-xl border border-primary/25 bg-primary/5 flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                {isAssignedTask ? <UserRound size={17} /> : <ClipboardList size={17} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">
                  {isAssignedTask
                    ? selectedUser?.name || 'No teammate selected'
                    : assignedRole}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {isAssignedTask
                    ? selectedUser?.email || 'Select one person for ownership.'
                    : 'Daily recurring work for this operational role.'}
                </p>
              </div>
            </div>

            {/* Teammate / Role Selection List */}
            <div className="space-y-2 flex-1 max-h-64 sm:max-h-80 overflow-y-auto pr-1 scrollbar-thin">
              {isAssignedTask ? (
                allUsers.length > 0 ? (
                  allUsers.map((user) => {
                    const isSelected = assignedTo === user.id;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        className={cn(
                          "w-full p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary/10 shadow-2xs"
                            : "border-border/70 bg-secondary/30 hover:bg-secondary hover:border-border"
                        )}
                        onClick={() => setAssignedTo(user.id)}
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center font-bold text-xs text-foreground shrink-0 border border-border/60">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (user.name || user.email || '?').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">{user.name || 'User'}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground italic">
                    Loading team members...
                  </div>
                )
              ) : (
                ROLE_OPTIONS.map((role) => {
                  const isSelected = assignedRole === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      className={cn(
                        "w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-2xs"
                          : "border-border/70 bg-secondary/30 hover:bg-secondary hover:border-border"
                      )}
                      onClick={() => setAssignedRole(role)}
                    >
                      <div>
                        <p className="text-xs font-bold text-foreground">{role}</p>
                        <p className="text-[11px] text-muted-foreground">Daily responsibility</p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

          </div>

        </div>

        {/* Footer Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            className="h-9 px-4 text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitDisabled}
            className="h-9 px-4 text-xs font-bold bg-primary text-primary-foreground shadow-2xs"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin mr-1.5" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Plus size={15} className="mr-1" />
                <span>Create Task</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
