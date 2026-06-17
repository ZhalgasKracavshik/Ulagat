
"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, X, Eye, Calendar, MapPin, FileText } from "lucide-react";
import { approveEvent, rejectEvent } from "@/app/admin/actions";
import Image from "next/image";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/hooks/useT";

/** Minimal shape of a pending event row passed from the admin page. */
type PendingEvent = {
    id: string;
    title: string;
    event_date: string;
    location: string | null;
    description: string | null;
    image_url: string | null;
    profiles?: { full_name: string | null } | null;
};

interface EventReviewTableProps {
    events: PendingEvent[];
}

export function EventReviewTable({ events }: EventReviewTableProps) {
    const { t } = useT();
    const [isLoading, setIsLoading] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    async function handleApprove(id: string) {
        setIsLoading(true);
        await approveEvent(id);
        setIsLoading(false);
    }

    async function handleReject() {
        if (!selectedId || !rejectionReason.trim()) return;
        setIsLoading(true);
        await rejectEvent(selectedId, rejectionReason);
        setIsLoading(false);
        setShowRejectDialog(false);
        setRejectionReason("");
        setSelectedId(null);
    }

    if (!events || events.length === 0) {
        return <div className="text-center py-12 text-muted-foreground">{t('admin.noPendingEvents')}</div>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t('admin.colTitle')}</TableHead>
                    <TableHead>{t('admin.colDate')}</TableHead>
                    <TableHead>{t('admin.colLocation')}</TableHead>
                    <TableHead>{t('admin.colOrganizer')}</TableHead>
                    <TableHead className="text-right">{t('admin.colActions')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {events.map((event) => (
                    <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell className="whitespace-nowrap">
                            {format(new Date(event.event_date), 'MMM d, h:mm a')}
                        </TableCell>
                        <TableCell>{event.location || t('admin.schoolHall')}</TableCell>
                        <TableCell>{event.profiles?.full_name}</TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                            <Eye className="w-4 h-4 mr-2" />
                                            {t('admin.viewAction')}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>{event.title}</DialogTitle>
                                            <DialogDescription>
                                                {t('admin.organizedBy', { name: event.profiles?.full_name ?? '' })}
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="grid gap-4 py-4">
                                            {event.image_url && (
                                                <div className="relative h-64 w-full rounded-lg overflow-hidden bg-muted">
                                                    <Image src={event.image_url} alt={event.title} fill className="object-cover" />
                                                </div>
                                            )}

                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Calendar className="w-4 h-4 text-blue-500" />
                                                    <strong>{format(new Date(event.event_date), 'EEEE, MMMM do yyyy @ h:mm a')}</strong>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <MapPin className="w-4 h-4 text-red-500" />
                                                    <span>{event.location || t('admin.schoolHall')}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <h4 className="font-medium flex items-center gap-2">
                                                    <FileText className="w-4 h-4" /> {t('admin.descriptionLabel')}
                                                </h4>
                                                <div className="text-sm text-muted-foreground dark:text-slate-300 whitespace-pre-wrap bg-muted p-4 rounded-md max-h-40 overflow-y-auto border border-dashed">
                                                    {event.description}
                                                </div>
                                            </div>
                                        </div>

                                        <DialogFooter className="gap-2 sm:gap-0">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedId(event.id);
                                                    setShowRejectDialog(true);
                                                }}
                                                disabled={isLoading}
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                {t('admin.reject')}
                                            </Button>
                                            <Button onClick={() => handleApprove(event.id)} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                                                <Check className="w-4 h-4 mr-2" />
                                                {t('admin.approve')}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>

            {/* Rejection Reason Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.rejectionTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('admin.rejectEventHint')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="reason">{t('admin.rejectionReason')}</Label>
                        <Input
                            id="reason"
                            placeholder={t('admin.rejectEventPlaceholder')}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="mt-2"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowRejectDialog(false)}>{t('admin.cancel')}</Button>
                        <Button variant="destructive" onClick={handleReject} disabled={isLoading || !rejectionReason.trim()}>
                            {t('admin.confirmRejection')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Table>
    );
}
