
import { createClient } from "@/lib/supabase/server";
import { BlockCard } from "./BlockCard";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { verifyChain } from "@/lib/reputation";

interface TrustChainProps {
    userId: string;
}

export async function TrustChain({ userId }: TrustChainProps) {
    const supabase = await createClient();

    // Fetch blocks
    const { data: blocks } = await supabase
        .from('reputation_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (!blocks || blocks.length === 0) {
        return (
            <div className="text-center p-8 text-muted-foreground">
                No reputation blocks mined yet.
            </div>
        );
    }

    // Verify Chain Integrity
    // Note: verifyChain currently does a DB fetch itself, but here we can optimize or just call it.
    // For now, let's call the library function to be safe.
    const isChainValid = await verifyChain(userId);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Trust Chain Ledger</h2>
                {isChainValid ? (
                    <div className="flex items-center text-green-600 gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-sm font-medium">Chain Verified</span>
                    </div>
                ) : (
                    <div className="flex items-center text-destructive gap-2 bg-destructive/10 px-3 py-1 rounded-full border border-destructive/20">
                        <ShieldAlert className="w-4 h-4" />
                        <span className="text-sm font-medium">Chain Compromised</span>
                    </div>
                )}
            </div>

            {!isChainValid && (
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Security Alert</AlertTitle>
                    <AlertDescription>
                        The cryptographic integrity of this reputation chain has been compromised. The hashes do not match the ledger history.
                    </AlertDescription>
                </Alert>
            )}

            <div className="mt-8">
                {blocks.map((block, index) => (
                    <BlockCard key={block.id} block={block} index={index} />
                ))}

                {/* Origin Generic Block Visualization */}
                <div className="pl-8 pt-4">
                    <div className="w-3 h-3 bg-muted rounded-full ml-[-22px]" />
                    <span className="text-xs text-muted-foreground ml-2">Genesis Origin</span>
                </div>
            </div>
        </div>
    );
}
