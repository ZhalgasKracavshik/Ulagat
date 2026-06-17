
"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { updateUserRole } from "@/app/admin/actions";
import { Loader2 } from "lucide-react";
import type { UserRole } from "@/types";

/** Minimal shape of a user row shown in the management table. */
type ManagedUser = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: UserRole;
};

interface UserManagementTableProps {
    users: ManagedUser[];
    currentUserId: string;
}

export function UserManagementTable({ users, currentUserId }: UserManagementTableProps) {
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

    async function handleRoleChange(userId: string, newRole: UserRole) {
        setLoadingMap(prev => ({ ...prev, [userId]: true }));
        try {
            await updateUserRole(userId, newRole);
        } catch (error) {
            alert("Failed to update role. You might not have permission.");
        } finally {
            setLoadingMap(prev => ({ ...prev, [userId]: false }));
        }
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email (Hidden)</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.map((user) => (
                    <TableRow key={user.id}>
                        <TableCell className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={user.avatar_url ?? undefined} />
                                <AvatarFallback>{user.full_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                                {user.full_name}
                                {user.id === currentUserId && <span className="text-muted-foreground text-xs ml-2">(You)</span>}
                            </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">***</TableCell>
                        <TableCell>
                            <Badge variant="outline" className={
                                user.role === 'admin' ? 'bg-red-50 dark:bg-red-950/40 text-red-700 border-red-200' :
                                    user.role === 'moderator' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 border-blue-200' :
                                        user.role === 'teacher' ? 'bg-green-50 dark:bg-green-950/40 text-green-700 border-green-200' : ''
                            }>
                                {user.role}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            {user.id !== currentUserId ? (
                                <div className="flex justify-end items-center gap-2">
                                    {loadingMap[user.id] && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                                    <Select
                                        defaultValue={user.role}
                                        onValueChange={(val) => handleRoleChange(user.id, val as UserRole)}
                                        disabled={loadingMap[user.id]}
                                    >
                                        <SelectTrigger className="w-[130px] h-8">
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
                ))}
            </TableBody>
        </Table>
    );
}
