
"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, X, Eye, FileText, Download, Tag, ShieldCheck } from "lucide-react";
import { approveMaterial, rejectMaterial } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/hooks/useT";

/** Minimal shape of a pending study-material row passed from the admin page. */
type PendingMaterial = {
    id: string;
    title: string;
    category: string;
    difficulty: string;
    description: string | null;
    url: string;
    profiles?: { full_name: string | null } | null;
};

interface MaterialReviewTableProps {
    materials: PendingMaterial[];
}

const DIFFICULTY_KEYS: Record<string, string> = {
    easy: 'admin.diffEasy',
    low: 'admin.diffEasy',
    medium: 'admin.diffMedium',
    hard: 'admin.diffHard',
    high: 'admin.diffHard',
};

export function MaterialReviewTable({ materials }: MaterialReviewTableProps) {
    const { t } = useT();
    const difficultyLabel = (d: string) => (DIFFICULTY_KEYS[d] ? t(DIFFICULTY_KEYS[d]) : d);
    const [isLoading, setIsLoading] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    async function handleApprove(id: string) {
        setIsLoading(true);
        await approveMaterial(id);
        setIsLoading(false);
    }

    async function handleReject() {
        if (!selectedId || !rejectionReason.trim()) return;
        setIsLoading(true);
        await rejectMaterial(selectedId, rejectionReason);
        setIsLoading(false);
        setShowRejectDialog(false);
        setRejectionReason("");
        setSelectedId(null);
    }

    if (!materials || materials.length === 0) {
        return <div className="text-center py-12 text-muted-foreground">{t('admin.noPendingMaterials')}</div>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t('admin.colTitle')}</TableHead>
                    <TableHead>{t('admin.colCategory')}</TableHead>
                    <TableHead>{t('admin.colDifficulty')}</TableHead>
                    <TableHead>{t('admin.colContributor')}</TableHead>
                    <TableHead className="text-right">{t('admin.colActions')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {materials.map((material) => (
                    <TableRow key={material.id}>
                        <TableCell className="font-medium">{material.title}</TableCell>
                        <TableCell>
                            <Badge variant="secondary" className="capitalize">{material.category}</Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className={`capitalize ${material.difficulty === 'high' ? 'text-red-600 border-red-200' :
                                    material.difficulty === 'medium' ? 'text-amber-600 border-amber-200' :
                                        'text-green-600 border-green-200'
                                }`}>
                                {difficultyLabel(material.difficulty)}
                            </Badge>
                        </TableCell>
                        <TableCell>{material.profiles?.full_name}</TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                            <Eye className="w-4 h-4 mr-2" />
                                            {t('admin.view')}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>{material.title}</DialogTitle>
                                            <DialogDescription>
                                                {t('admin.uploadedBy', { name: material.profiles?.full_name ?? '' })}
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="grid gap-6 py-4">
                                            <div className="flex flex-wrap gap-4">
                                                <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg border">
                                                    <Tag className="w-4 h-4 text-indigo-500" />
                                                    <span className="text-sm font-medium">{t('admin.categoryLabel')} {material.category}</span>
                                                </div>
                                                <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg border">
                                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                                    <span className="text-sm font-medium underline">{t('admin.difficultyLabel')} {difficultyLabel(material.difficulty)}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <h4 className="font-medium flex items-center gap-2">
                                                    <FileText className="w-4 h-4" /> {t('admin.descriptionLabel')}
                                                </h4>
                                                <p className="text-sm text-muted-foreground bg-muted p-4 rounded-md border border-dashed">
                                                    {material.description || t('admin.noDescriptionProvided')}
                                                </p>
                                            </div>

                                            <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-card p-2 rounded-lg shadow-sm">
                                                        <FileText className="w-6 h-6 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-blue-900">{t('admin.resourceFile')}</p>
                                                        <p className="text-xs text-blue-600">{t('admin.resourceFileReady')}</p>
                                                    </div>
                                                </div>
                                                <Button size="sm" asChild>
                                                    <a href={material.url} target="_blank" rel="noopener noreferrer">
                                                        <Download className="w-4 h-4 mr-2" />
                                                        {t('admin.openResource')}
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>

                                        <DialogFooter className="gap-2 sm:gap-0">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedId(material.id);
                                                    setShowRejectDialog(true);
                                                }}
                                                disabled={isLoading}
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                {t('admin.reject')}
                                            </Button>
                                            <Button onClick={() => handleApprove(material.id)} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
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
                            {t('admin.rejectMaterialHint')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="reason">{t('admin.rejectionReason')}</Label>
                        <Input
                            id="reason"
                            placeholder={t('admin.rejectMaterialPlaceholder')}
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
