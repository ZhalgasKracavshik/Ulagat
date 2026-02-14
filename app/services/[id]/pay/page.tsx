
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, CreditCard } from "lucide-react";
import { redirect } from "next/navigation";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function PaymentPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch service
    const { data: service } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single();

    if (!service) return <div>Service not found</div>;

    // Payment Action (Mocked)
    async function processPayment() {
        "use server";
        const supabase = await createClient();

        // Update status to PENDING (Moderation required)
        await supabase.from('services').update({ status: 'pending' }).eq('id', id);

        // Redirect to services with a success flag
        redirect('/services?payment_success=true');
    }

    return (
        <div className="container flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md w-full border-green-200">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                        <CreditCard className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-2xl">Confirm Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                    <p className="text-muted-foreground">
                        You are about to pay <span className="font-bold text-black">100 ₸</span> to list your service:
                    </p>
                    <div className="bg-slate-50 p-4 rounded font-bold text-lg">
                        "{service.title}"
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Secure payment via Stripe (Simulated)
                    </p>
                </CardContent>
                <CardFooter>
                    <form action={processPayment} className="w-full">
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-lg h-12">
                            Submit for Review (100 ₸)
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    );
}
