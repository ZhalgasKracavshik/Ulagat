
"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, X, Eye, FileText, Download, User, Tag } from "lucide-react";
import { approveMaterial, rejectMaterial } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MaterialReviewTableProps {
    materials: any[];
}

export function MaterialReviewTable({ materials }: MaterialReviewTableProps) {
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
        return <div className="text-center py-12 text-muted-foreground">No pending study materials to review. 📚</div>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Contributor</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                                {material.difficulty}
                            </Badge>
                        </TableCell>
                        <TableCell>{material.profiles?.full_name}</TableCell>
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
                                            <DialogTitle>{material.title}</DialogTitle>
                                            <DialogDescription>
                                                Uploaded by {material.profiles?.full_name}
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="grid gap-6 py-4">
                                            <div className="flex flex-wrap gap-4">
                                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border">
                                                    <Tag className="w-4 h-4 text-indigo-500" />
                                                    <span className="text-sm font-medium">Category: {material.category}</span>
                                                </div>
                                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border">
                                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                                    <span className="text-sm font-medium underline">Difficulty: {material.difficulty}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <h4 className="font-medium flex items-center gap-2">
                                                    <FileText className="w-4 h-4" /> Description
                                                </h4>
                                                <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-md border border-dashed">
                                                    {material.description || 'No description provided.'}
                                                </p>
                                            </div>

                                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-white p-2 rounded-lg shadow-sm">
                                                        <FileText className="w-6 h-6 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-blue-900">Resource File</p>
                                                        <p className="text-xs text-blue-600">Material Link is ready for review</p>
                                                    </div>
                                                </div>
                                                <Button size="sm" asChild>
                                                    <a href={material.url} target="_blank" rel="noopener noreferrer">
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Open Resource
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
                                                Reject
                                            </Button>
                                            <Button onClick={() => handleApprove(material.id)} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
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
                            Please provide a brief reason why this study material is being rejected. The contributor will see this feedback.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="reason">Rejection Reason</Label>
                        <Input
                            id="reason"
                            placeholder="e.g. Broken link, incorrect difficulty, irrelevant content, etc."
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

// Helper icon (since ShieldCheck might not be imported from lucide-react above if filtered by me)
import { ShieldCheck } from "lucide-react";
