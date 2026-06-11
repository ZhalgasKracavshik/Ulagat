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
import type { UserRole, AdminUserRow } from '@/types';

interface UsersManagementTableProps {
    users: AdminUserRow[];
    currentUserId: string;
}

export function UsersManagementTable({ users, currentUserId }: UsersManagementTableProps) {
    const [loadingRole, setLoadingRole] = useState<Record<string, boolean>>({});
    const [loadingSkud, setLoadingSkud] = useState<Record<string, boolean>>({});
    const [skudEditing, setSkudEditing] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    async function handleRoleChange(userId: string, newRole: UserRole) {
        setLoadingRole((prev) => ({ ...prev, [userId]: true }));
        setErrors((prev) => ({ ...prev, [userId]: '' }));
        const result = await updateUserRole(userId, newRole);
        if (result.error) {
            setErrors((prev) => ({ ...prev, [userId]: result.error ?? 'Error' }));
        }
        setLoadingRole((prev) => ({ ...prev, [userId]: false }));
    }

    async function handleSkudSave(userId: string) {
        const val = skudEditing[userId] ?? '';
        setLoadingSkud((prev) => ({ ...prev, [userId]: true }));
        const result = await updateUserSkudId(userId, val);
        if (result.error) {
            setErrors((prev) => ({ ...prev, [`skud_${userId}`]: result.error ?? 'Error' }));
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
            case 'admin': return 'bg-red-50 text-red-700 border-red-200';
            case 'moderator': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'teacher': return 'bg-green-50 text-green-700 border-green-200';
            case 'parent': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'parliament': return 'bg-purple-50 text-purple-700 border-purple-200';
            default: return '';
        }
    };

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Grade / Class</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>SKUD ID</TableHead>
                        <TableHead className="text-right">Change Role</TableHead>
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
                                                    <span className="text-muted-foreground text-xs ml-2">(You)</span>
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
                                        {user.role}
                                    </Badge>
                                    {errors[user.id] && (
                                        <p className="text-xs text-red-500 mt-1">{errors[user.id]}</p>
                                    )}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {user.grade ? `Grade ${user.grade}` : '—'}
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
                                                placeholder="SKUD ID"
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
                                            {user.external_skud_id || 'Set SKUD ID'}
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
                                                    <SelectItem value="student">Student</SelectItem>
                                                    <SelectItem value="teacher">Teacher</SelectItem>
                                                    <SelectItem value="parent">Parent</SelectItem>
                                                    <SelectItem value="parliament">Parliament</SelectItem>
                                                    <SelectItem value="moderator">Moderator</SelectItem>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">Cannot edit self</span>
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
