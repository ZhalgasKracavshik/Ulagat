import { ArrowRight, BookOpen, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
      {/* Hero Section */}
      <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
        <div className="container mx-auto flex max-w-[64rem] flex-col items-center gap-4 text-center px-4 md:px-6">
          <Link
            href="/events"
            className="rounded-2xl bg-muted px-4 py-1.5 text-sm font-medium transition-colors hover:bg-muted/80 backdrop-blur-sm"
          >
            🎉 Upcoming School Olympics &rarr;
          </Link>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-600 to-secondary animate-in fade-in slide-in-from-bottom-4 duration-500">
            Unlock Knowledge with Ulagat
          </h1>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8 mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            The ultimate platform for school services, events, and community growth. Find tutors, join competitions, and showcase your skills.
          </p>
          <div className="space-x-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            <Link
              href={user ? "/services" : "/register"}
              className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium h-11 px-8 shadow-lg hover:bg-primary/90 hover:scale-105 transition-all"
            >
              Get Started
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center justify-center rounded-lg border border-input bg-background/50 backdrop-blur-sm text-sm font-medium h-11 px-8 shadow-sm hover:bg-accent hover:text-accent-foreground transition-all"
            >
              Explore Services
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto space-y-6 py-8 md:py-12 lg:py-24 px-4 md:px-6">
        <div className="mx-auto grid justify-center gap-6 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
          <div className="relative overflow-hidden rounded-xl border bg-background/50 backdrop-blur-sm p-2 transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
            <div className="flex h-[200px] flex-col justify-between rounded-md p-6">
              <div className="p-3 bg-blue-100 w-fit rounded-full text-blue-600">
                <BookOpen className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-xl">Tutoring Services</h3>
                <p className="text-sm text-muted-foreground">
                  Find expert tutors for any subject, from Math to Music history.
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border bg-background/50 backdrop-blur-sm p-2 transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
            <div className="flex h-[200px] flex-col justify-between rounded-md p-6">
              <div className="p-3 bg-yellow-100 w-fit rounded-full text-yellow-600">
                <Trophy className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-xl">School Events</h3>
                <p className="text-sm text-muted-foreground">
                  Participate in Olympics, hackathons, and sports competitions.
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border bg-background/50 backdrop-blur-sm p-2 transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
            <div className="flex h-[200px] flex-col justify-between rounded-md p-6">
              <div className="p-3 bg-pink-100 w-fit rounded-full text-pink-600">
                <Users className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-xl">Community</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with teachers and students. Share knowledge and grow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Decorative gradient blob */}
      <div className="fixed top-20 left-0 -z-10 h-[300px] w-[300px] rounded-full bg-primary/20 blur-[100px]" />
      <div className="fixed bottom-0 right-0 -z-10 h-[300px] w-[300px] rounded-full bg-secondary/20 blur-[100px]" />
    </div>
  );
}
