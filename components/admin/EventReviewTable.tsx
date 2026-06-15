
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

interface EventReviewTableProps {
    events: any[];
}

export function EventReviewTable({ events }: EventReviewTableProps) {
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
        return <div className="text-center py-12 text-muted-foreground">No pending events to review. 🏆</div>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Organizer</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {events.map((event) => (
                    <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell className="whitespace-nowrap">
                            {format(new Date(event.event_date), 'MMM d, h:mm a')}
                        </TableCell>
                        <TableCell>{event.location || 'School Hall'}</TableCell>
                        <TableCell>{event.profiles?.full_name}</TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                            <Eye className="w-4 h-4 mr-2" />
                                            View
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>{event.title}</DialogTitle>
                                            <DialogDescription>
                                                Organized by {event.profiles?.full_name}
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
                                                    <span>{event.location || 'School Hall'}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <h4 className="font-medium flex items-center gap-2">
                                                    <FileText className="w-4 h-4" /> Description
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
                                                Reject
                                            </Button>
                                            <Button onClick={() => handleApprove(event.id)} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                                                <Check className="w-4 h-4 mr-2" />
                                                Approve
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
                        <DialogTitle>Reason for Rejection</DialogTitle>
                        <DialogDescription>
                            Please provide a brief reason why this event is being rejected. The organizer will see this feedback.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="reason">Rejection Reason</Label>
                        <Input
                            id="reason"
                            placeholder="e.g. Inappropriate content, duplicant event, etc."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="mt-2"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleReject} disabled={isLoading || !rejectionReason.trim()}>
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Table>
    );
}
