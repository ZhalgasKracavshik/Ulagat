
"use client";

import { ReputationBlock } from "@/types";
import { formatDistanceToNow } from "date-fns"; // Check if date-fns is installed. If not, I'll use native formatting.
import { Box, Hash, Clock, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface BlockCardProps {
    block: ReputationBlock;
    index: number;
}

export function BlockCard({ block, index }: BlockCardProps) {
    // Simple hash shortener
    const shortHash = (hash: string) => `${hash.slice(0, 8)}...${hash.slice(-8)}`;

    const isGenesis = block.action_type === 'genesis';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative pl-8 pb-8 border-l-2 border-primary/20 last:border-l-0 last:pb-0"
        >
            {/* Connector Dot */}
            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-background ${isGenesis ? 'bg-yellow-500' : 'bg-primary'}`} />

            <Card className={`overflow-hidden transition-all hover:shadow-lg ${isGenesis ? 'border-yellow-400 bg-yellow-50/10' : ''}`}>
                <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Hash className="w-24 h-24" />
                </div>

                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                                {isGenesis ? <Award className="w-5 h-5 text-yellow-500" /> : <Box className="w-4 h-4 text-primary" />}
                                <span className="capitalize">{block.action_type.replace('_', ' ')}</span>
                            </CardTitle>
                            <CardDescription className="font-mono text-xs text-muted-foreground">
                                Block #{block.id.slice(0, 8)}
                            </CardDescription>
                        </div>
                        <Badge variant={isGenesis ? "default" : "secondary"} className={isGenesis ? "bg-yellow-500 hover:bg-yellow-600" : ""}>
                            +{block.points} Rep
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4 text-sm">
                    {/* Metadata Display */}
                    {block.metadata && Object.keys(block.metadata).length > 0 && (
                        <div className="bg-muted/50 p-2 rounded text-xs font-mono">
                            {JSON.stringify(block.metadata, null, 2)}
                        </div>
                    )}

                    {/* Hash Chain Info */}
                    <div className="grid grid-cols-1 gap-1 text-[10px] text-muted-foreground font-mono">
                        <div className="flex items-center justify-between">
                            <span>PREV:</span>
                            <span className="truncate max-w-[200px]">{shortHash(block.previous_hash)}</span>
                        </div>
                        <div className="flex items-center justify-between font-bold text-primary/70">
                            <span>CURR:</span>
                            <span className="truncate max-w-[200px]">{shortHash(block.current_hash)}</span>
                        </div>
                    </div>

                    <div className="flex items-center text-xs text-muted-foreground mt-2">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(block.created_at).toLocaleString()}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
