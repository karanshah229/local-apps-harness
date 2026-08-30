import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from './ui/sheet';
import { Button } from './ui/button';
import { Share2, UserPlus, Trash2, Users } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ShareListModal({
  isOpen,
  onClose,
  list,
  users,
  onShareList,
  onRemoveShare
}) {
  const [selectedUserId, setSelectedUserId] = useState('');

  if (!list) return null;

  const members = list.members || [];
  const memberIds = members.map((m) => m.id);
  const availableUsers = users.filter(
    (u) => u.id !== list.created_by && !memberIds.includes(u.id)
  );

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    onShareList(list.id, parseInt(selectedUserId));
    setSelectedUserId('');
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl p-5 pt-3">
        <SheetHeader className="pb-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-lg font-bold">
            <Share2 className="w-5 h-5 text-primary" />
            <span>Share List: "{list.title}"</span>
          </SheetTitle>
          <SheetDescription className="text-xs">
            Shared members receive real-time updates whenever anyone adds or completes tasks in this list.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          {/* Add member picker */}
          <form onSubmit={handleAddMember} className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
              Add Member from Contacts
            </label>
            <div className="flex gap-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1 h-12 px-3 rounded-xl bg-background border border-border text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              >
                <option value="">Select contact from library...</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    👤 {u.name} ({u.email})
                  </option>
                ))}
              </select>
              <Button
                type="submit"
                size="lg"
                disabled={!selectedUserId}
                className="h-12 px-5 font-semibold"
              >
                Add
              </Button>
            </div>
          </form>

          {/* Members List */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
              Active List Members ({members.length})
            </div>

            {members.length === 0 ? (
              <div className="text-center py-6 px-4 bg-muted/30 rounded-xl border border-dashed border-border text-muted-foreground text-xs">
                This list is not shared with anyone yet. Select a contact above to share!
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border shadow-sm min-h-[56px]"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img
                        src={
                          m.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`
                        }
                        alt={m.name}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-border flex-shrink-0"
                      />
                      <div className="overflow-hidden">
                        <div className="text-sm font-bold truncate">{m.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{m.phone}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveShare(list.id, m.id)}
                      className="p-2 text-muted-foreground hover:text-destructive rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                      title="Remove access"
                      aria-label={`Remove access for ${m.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-border mt-2">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full h-11 font-semibold"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
