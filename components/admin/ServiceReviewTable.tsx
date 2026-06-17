
"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, X, Eye, FileText } from "lucide-react";
import { approveService, rejectService } from "@/app/admin/actions";
import { useT } from "@/hooks/useT";
import { Input } from "@/components/ui/input";
import Image from "next/image";

/** Minimal shape of a pending service row passed from the admin page. */
type PendingService = {
    id: string;
    title: string;
    category: string | null;
    price: number;
    description: string | null;
    image_url: string | null;
    created_at: string;
    profiles?: { full_name: string | null } | null;
};

interface ServiceReviewTableProps {
    services: PendingService[];
}

export function ServiceReviewTable({ services }: ServiceReviewTableProps) {
    const { t } = useT();
    const [isLoading, setIsLoading] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    async function handleApprove(id: string) {
        setIsLoading(true);
        await approveService(id);
        setIsLoading(false);
    }

    async function handleReject() {
        if (!selectedId || !rejectionReason.trim()) return;
        setIsLoading(true);
        await rejectService(selectedId, rejectionReason);
        setIsLoading(false);
        setShowRejectDialog(false);
        setRejectionReason("");
        setSelectedId(null);
    }

    if (!services || services.length === 0) {
        return <div className="text-center py-12 text-muted-foreground">{t('admin.noPendingServices')}</div>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t('admin.colTitle')}</TableHead>
                    <TableHead>{t('admin.colCategory')}</TableHead>
                    <TableHead>{t('admin.colOwner')}</TableHead>
                    <TableHead>{t('admin.colPrice')}</TableHead>
                    <TableHead className="text-right">{t('admin.colActions')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {services.map((service) => (
                    <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.title}</TableCell>
                        <TableCell>{service.category || 'N/A'}</TableCell>
                        <TableCell>{service.profiles?.full_name}</TableCell>
                        <TableCell>{service.price} ₸</TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedId(service.id)}>
                                            <Eye className="w-4 h-4 mr-2" />
                                            {t('admin.viewAction')}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>{service.title}</DialogTitle>
                                            <DialogDescription>
                                                {t('admin.postedBy', { name: service.profiles?.full_name ?? '', date: new Date(service.created_at).toLocaleDateString() })}
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="grid gap-4 py-4">
                                            {service.image_url && (
                                                <div className="relative h-64 w-full rounded-lg overflow-hidden bg-muted">
                                                    <Image src={service.image_url} alt={service.title} fill className="object-cover" />
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <h4 className="font-medium flex items-center gap-2">
                                                    <FileText className="w-4 h-4" /> {t('admin.descriptionLabel')}
                                                </h4>
                                                <p className="text-sm text-muted-foreground dark:text-slate-300 whitespace-pre-wrap bg-muted p-4 rounded-md">
                                                    {service.description}
                                                </p>
                                            </div>

                                            <div className="flex gap-4 text-sm">
                                                <div className="bg-muted px-3 py-1 rounded">{t('admin.priceLabel')} <strong>{service.price} ₸</strong></div>
                                                <div className="bg-muted px-3 py-1 rounded">{t('admin.categoryLabel')} <strong>{service.category}</strong></div>
                                            </div>
                                        </div>

                                        <DialogFooter className="gap-2 sm:gap-0">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedId(service.id);
                                                    setShowRejectDialog(true);
                                                }}
                                                disabled={isLoading}
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                {t('admin.reject')}
                                            </Button>
                                            <Button onClick={() => handleApprove(service.id)} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
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
                            {t('admin.rejectServiceHint')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <label htmlFor="reason" className="text-sm font-medium">{t('admin.rejectionReason')}</label>
                        <Input
                            id="reason"
                            placeholder={t('admin.rejectServicePlaceholder')}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
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
