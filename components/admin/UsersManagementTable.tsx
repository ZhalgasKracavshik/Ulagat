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
import { updateUserRole, updateUserSkudId } from '@/app/admin/users/actions';
import { Loader2, Check, X } from 'lucide-react';
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

export function UsersManagementTable({ users, currentUserId }: UsersManagementTableProps) {
    const { t } = useT();
    const roleLabel = (role: string) => (ROLE_KEYS[role] ? t(ROLE_KEYS[role]) : role);
    const [loadingRole, setLoadingRole] = useState<Record<string, boolean>>({});
    const [loadingSkud, setLoadingSkud] = useState<Record<string, boolean>>({});
    const [skudEditing, setSkudEditing] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    async function handleRoleChange(userId: string, newRole: UserRole) {
        setLoadingRole((prev) => ({ ...prev, [userId]: true }));
        setErrors((prev) => ({ ...prev, [userId]: '' }));
        const result = await updateUserRole(userId, newRole);
        if (result.error) {
            setErrors((prev) => ({ ...prev, [userId]: result.error ?? t('admin.error') }));
        }
        setLoadingRole((prev) => ({ ...prev, [userId]: false }));
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

    return (
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
                    {users.map((user) => {
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
                                                defaultValue={user.role}
                                                onValueChange={(val) => handleRoleChange(user.id, val as UserRole)}
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
    );
}
