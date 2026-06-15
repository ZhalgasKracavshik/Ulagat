'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateInviteCode } from '@/app/profile/invite/actions';
import { Copy, Check, Users, Clock } from 'lucide-react';

interface ExistingToken {
    token: string;
    expires_at: string;
    used_at: string | null;
}

interface InviteParentSectionProps {
    studentId: string;
    existingTokens: ExistingToken[];
}

export function InviteParentSection({ studentId, existingTokens }: InviteParentSectionProps) {
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const unusedTokens = existingTokens.filter(
        (t) => !t.used_at && new Date(t.expires_at) > new Date()
    );

    async function handleGenerate() {
        setIsLoading(true);
        setError(null);
        const result = await generateInviteCode(studentId);
        setIsLoading(false);

        if ('error' in result) {
            setError(result.error);
        } else {
            setGeneratedCode(result.code);
        }
    }

    async function handleCopy(code: string) {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const el = document.createElement('textarea');
            el.value = code;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    const activeCode = generatedCode || (unusedTokens.length > 0 ? unusedTokens[0].token : null);
    const activeExpiry = generatedCode
        ? null // just generated, show generic message
        : unusedTokens.length > 0
            ? new Date(unusedTokens[0].expires_at)
            : null;

    return (
        <Card className="border-dashed border-blue-200 bg-blue-50/40 dark:bg-blue-950/40">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-blue-800">
                    <Users className="w-4 h-4" />
                    Invite Parent
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Generate a 6-digit code for your parent or guardian to register and link to your account.
                </p>

                {error && (
                    <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">{error}</p>
                )}

                {activeCode ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 bg-card border border-blue-200 rounded-xl p-4">
                            <span className="text-3xl font-mono font-bold tracking-widest text-blue-700 flex-1 text-center">
                                {activeCode}
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopy(activeCode)}
                                className="shrink-0"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                            </Button>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {generatedCode
                                ? 'Expires in 24 hours'
                                : activeExpiry
                                    ? `Expires ${activeExpiry.toLocaleString()}`
                                    : 'Expires in 24 hours'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Share this code with your parent. They can enter it on the{' '}
                            <a href={`/register?invite=${activeCode}`} className="text-primary hover:underline">
                                registration page
                            </a>
                            .
                        </p>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="w-full"
                        >
                            Generate New Code
                        </Button>
                    </div>
                ) : (
                    <Button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full"
                        size="sm"
                    >
                        {isLoading ? 'Generating...' : 'Generate Invite Code'}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
