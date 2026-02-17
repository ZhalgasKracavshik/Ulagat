
"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, X, Eye, FileText } from "lucide-react";
import { approveService, rejectService } from "@/app/admin/actions";
import Image from "next/image";

interface ServiceReviewTableProps {
    services: any[];
}

export function ServiceReviewTable({ services }: ServiceReviewTableProps) {
    const [selectedService, setSelectedService] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleApprove(id: string) {
        setIsLoading(true);
        await approveService(id);
        setIsLoading(false);
        setSelectedService(null);
    }

    async function handleReject(id: string) {
        setIsLoading(true);
        await rejectService(id);
        setIsLoading(false);
        setSelectedService(null);
    }

    if (!services || services.length === 0) {
        return <div className="text-center py-12 text-muted-foreground">No pending services to review. 🎉</div>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedService(service)}>
                                            <Eye className="w-4 h-4 mr-2" />
                                            View
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>{service.title}</DialogTitle>
                                            <DialogDescription>
                                                Posted by {service.profiles?.full_name} • {new Date(service.created_at).toLocaleDateString()}
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="grid gap-4 py-4">
                                            {service.image_url && (
                                                <div className="relative h-64 w-full rounded-lg overflow-hidden bg-slate-100">
                                                    <Image src={service.image_url} alt={service.title} fill className="object-cover" />
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <h4 className="font-medium flex items-center gap-2">
                                                    <FileText className="w-4 h-4" /> Description
                                                </h4>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 p-4 rounded-md">
                                                    {service.description}
                                                </p>
                                            </div>

                                            <div className="flex gap-4 text-sm">
                                                <div className="bg-slate-100 px-3 py-1 rounded">Price: <strong>{service.price} ₸</strong></div>
                                                <div className="bg-slate-100 px-3 py-1 rounded">Category: <strong>{service.category}</strong></div>
                                            </div>
                                        </div>

                                        <DialogFooter className="gap-2 sm:gap-0">
                                            <Button variant="outline" onClick={() => handleReject(service.id)} disabled={isLoading}>
                                                <X className="w-4 h-4 mr-2" />
                                                Reject
                                            </Button>
                                            <Button onClick={() => handleApprove(service.id)} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
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
        </Table>
    );
}
