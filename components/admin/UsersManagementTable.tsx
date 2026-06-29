'use client';

import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { updateUserRole, updateUserSkudId } from '@/app/admin/users/actions';
import { Loader2, Check, X, ShieldAlert, Search } from 'lucide-react';
import { useT } from '@/hooks/useT';
import type { UserRole, AdminUserRow } from '@/types';

interface UsersManagementTableProps {
    users: AdminUserRow[];
    currentUserId: string;
}

const ROLE_KEYS: Record<string, string> = {
    student: 'admin.roleStudent',
    teacher: 'admin.roleTeacher',
    parent: 'admin.roleParent',
    parliament: 'admin.roleParliament',
    moderator: 'admin.roleModerator',
    admin: 'admin.roleAdmin',
};

// Powerful roles whose assignment requires an explicit confirmation step.
const ELEVATED_ROLES: UserRole[] = ['admin', 'moderator'];

export function UsersManagementTable({ users, currentUserId }: UsersManagementTableProps) {
    const { t } = useT();
    const roleLabel = (role: string) => (ROLE_KEYS[role] ? t(ROLE_KEYS[role]) : role);
    const [roleValues, setRoleValues] = useState<Record<string, UserRole>>({});
    const [loadingRole, setLoadingRole] = useState<Record<string, boolean>>({});
    const [loadingSkud, setLoadingSkud] = useState<Record<string, boolean>>({});
    const [skudEditing, setSkudEditing] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [confirm, setConfirm] = useState<{ userId: string; newRole: UserRole; name: string } | null>(null);
    const [query, setQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    const effectiveRole = (user: AdminUserRow): UserRole => roleValues[user.id] ?? user.role;

    async function commitRole(userId: string, newRole: UserRole, prevRole: UserRole) {
        setRoleValues((prev) => ({ ...prev, [userId]: newRole })); // optimistic
        setLoadingRole((prev) => ({ ...prev, [userId]: true }));
        setErrors((prev) => ({ ...prev, [userId]: '' }));
        const result = await updateUserRole(userId, newRole);
        if (result.error) {
            setErrors((prev) => ({ ...prev, [userId]: result.error ?? t('admin.error') }));
            setRoleValues((prev) => ({ ...prev, [userId]: prevRole })); // revert on failure
        }
        setLoadingRole((prev) => ({ ...prev, [userId]: false }));
    }

    function requestRoleChange(user: AdminUserRow, newRole: UserRole) {
        const current = effectiveRole(user);
        if (newRole === current) return;
        // Granting a powerful role needs explicit confirmation so an accidental
        // click cannot silently escalate someone to admin/moderator.
        if (ELEVATED_ROLES.includes(newRole)) {
            setConfirm({ userId: user.id, newRole, name: user.full_name || user.id.slice(0, 8) });
            return;
        }
        commitRole(user.id, newRole, current);
    }

    async function handleSkudSave(userId: string) {
        const val = skudEditing[userId] ?? '';
        setLoadingSkud((prev) => ({ ...prev, [userId]: true }));
        const result = await updateUserSkudId(userId, val);
        if (result.error) {
            setErrors((prev) => ({ ...prev, [`skud_${userId}`]: result.error ?? t('admin.error') }));
        } else {
            setSkudEditing((prev) => {
                const next = { ...prev };
                delete next[userId];
                return next;
            });
        }
        setLoadingSkud((prev) => ({ ...prev, [userId]: false }));
    }

    function handleSkudCancel(userId: string) {
        setSkudEditing((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
        });
    }

    const roleBadgeClass = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-red-50 dark:bg-red-950/40 text-red-700 border-red-200';
            case 'moderator': return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 border-blue-200';
            case 'teacher': return 'bg-green-50 dark:bg-green-950/40 text-green-700 border-green-200';
            case 'parent': return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 border-amber-200';
            case 'parliament': return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 border-purple-200';
            default: return '';
        }
    };

    const q = query.trim().toLowerCase();
    const filteredUsers = users.filter((u) => {
        if (roleFilter && u.role !== roleFilter) return false;
        if (!q) return true;
        return (u.full_name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q);
    });

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('admin.searchUsers')}
                        className="h-10 pl-9"
                    />
                </div>
                <select
                    aria-label={t('admin.colRole')}
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                >
                    <option value="">{t('admin.allRoles')}</option>
                    <option value="student">{t('admin.roleStudent')}</option>
                    <option value="teacher">{t('admin.roleTeacher')}</option>
                    <option value="parent">{t('admin.roleParent')}</option>
                    <option value="parliament">{t('admin.roleParliament')}</option>
                    <option value="moderator">{t('admin.roleModerator')}</option>
                    <option value="admin">{t('admin.roleAdmin')}</option>
                </select>
            </div>
            <p className="text-xs text-muted-foreground">
                {t('admin.showingCount').replace('{shown}', String(filteredUsers.length)).replace('{total}', String(users.length))}
            </p>
            <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('admin.colUser')}</TableHead>
                        <TableHead>{t('admin.colEmail')}</TableHead>
                        <TableHead>{t('admin.colRole')}</TableHead>
                        <TableHead>{t('admin.colGradeClass')}</TableHead>
                        <TableHead>{t('admin.colJoined')}</TableHead>
                        <TableHead>{t('admin.colSkud')}</TableHead>
                        <TableHead className="text-right">{t('admin.colChangeRole')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredUsers.map((user) => {
                        const isCurrentUser = user.id === currentUserId;
                        const isEditingSkud = skudEditing[user.id] !== undefined;
                        const skudValue = isEditingSkud
                            ? skudEditing[user.id]
                            : (user.external_skud_id ?? '');

                        return (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={user.avatar_url ?? undefined} />
                                            <AvatarFallback>{user.full_name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-sm">
                                                {user.full_name}
                                                {isCurrentUser && (
                                                    <span className="text-muted-foreground text-xs ml-2">{t('admin.you')}</span>
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{user.id.slice(0, 8)}…</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {user.email || '—'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={roleBadgeClass(user.role)}>
                                        {roleLabel(user.role)}
                                    </Badge>
                                    {errors[user.id] && (
                                        <p className="text-xs text-red-500 mt-1">{errors[user.id]}</p>
                                    )}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {user.grade ? t('admin.gradeLabel', { grade: user.grade }) : '—'}
                                    {user.class_letter ? ` ${user.class_letter}` : ''}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                    {isCurrentUser ? (
                                        <span className="text-xs text-muted-foreground">{user.external_skud_id ?? '—'}</span>
                                    ) : isEditingSkud ? (
                                        <div className="flex items-center gap-1">
                                            <Input
                                                value={skudValue}
                                                onChange={(e) =>
                                                    setSkudEditing((prev) => ({ ...prev, [user.id]: e.target.value }))
                                                }
                                                className="h-7 w-28 text-xs"
                                                placeholder={t('admin.skudPlaceholder')}
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7"
                                                onClick={() => handleSkudSave(user.id)}
                                                disabled={loadingSkud[user.id]}
                                            >
                                                {loadingSkud[user.id] ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Check className="w-3 h-3 text-green-600" />
                                                )}
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7"
                                                onClick={() => handleSkudCancel(user.id)}
                                            >
                                                <X className="w-3 h-3 text-red-500" />
                                            </Button>
                                            {errors[`skud_${user.id}`] && (
                                                <p className="text-xs text-red-500">{errors[`skud_${user.id}`]}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            className="text-xs text-muted-foreground hover:text-primary hover:underline"
                                            onClick={() =>
                                                setSkudEditing((prev) => ({
                                                    ...prev,
                                                    [user.id]: user.external_skud_id ?? '',
                                                }))
                                            }
                                        >
                                            {user.external_skud_id || t('admin.setSkud')}
                                        </button>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {!isCurrentUser ? (
                                        <div className="flex justify-end items-center gap-2">
                                            {loadingRole[user.id] && (
                                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                            )}
                                            <Select
                                                value={effectiveRole(user)}
                                                onValueChange={(val) => requestRoleChange(user, val as UserRole)}
                                                disabled={loadingRole[user.id]}
                                            >
                                                <SelectTrigger className="w-[140px] h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="student">{t('admin.roleStudent')}</SelectItem>
                                                    <SelectItem value="teacher">{t('admin.roleTeacher')}</SelectItem>
                                                    <SelectItem value="parent">{t('admin.roleParent')}</SelectItem>
                                                    <SelectItem value="parliament">{t('admin.roleParliament')}</SelectItem>
                                                    <SelectItem value="moderator">{t('admin.roleModerator')}</SelectItem>
                                                    <SelectItem value="admin">{t('admin.roleAdmin')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">{t('admin.cannotEditSelf')}</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            </div>

            {/* Empty state when filters match nobody */}
            {filteredUsers.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">{t('admin.noMatches')}</p>
            )}

            {/* Elevated-role confirmation (admin / moderator) */}
            <Dialog open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-amber-500" />
                            {t('admin.confirmRoleTitle')}
                        </DialogTitle>
                        <DialogDescription>
                            {confirm
                                ? t('admin.confirmRoleBody', { role: roleLabel(confirm.newRole), name: confirm.name })
                                : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirm(null)}>
                            {t('admin.cancel')}
                        </Button>
                        <Button
                            className="bg-amber-600 text-white hover:bg-amber-700"
                            onClick={() => {
                                if (confirm) {
                                    const u = users.find((x) => x.id === confirm.userId);
                                    const prev = (roleValues[confirm.userId] ?? u?.role ?? 'student') as UserRole;
                                    commitRole(confirm.userId, confirm.newRole, prev);
                                }
                                setConfirm(null);
                            }}
                        >
                            {t('admin.confirmRoleGrant')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
