import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Buzmark | Talk to our marketing team" },
      {
        name: "description",
        content:
          "Get in touch with Buzmark Marketing and Consulting Agency in Nairobi — phone, email, office hours and a quick enquiry form.",
      },
      { property: "og:title", content: "Contact Buzmark Consultants" },
      { property: "og:description", content: "Talk to our team about your next project." },
    ],
  }),
  component: Contact,
});

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(20).optional(),
  subject: z.string().trim().min(2, "Add a subject").max(120),
  message: z.string().trim().min(10, "Tell us a little more").max(1000),
});

const DETAILS = [
  { icon: MapPin, label: "Office", value: "Ruiru, Nairobi, Kenya" },
  { icon: Phone, label: "Phone", value: "+254 705 242 144" },
  { icon: Mail, label: "Email", value: "hello@buzmark.com" },
  { icon: Clock, label: "Hours", value: "Mon – Fri, 8:30am – 5:30pm" },
];

function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    toast.success("Thanks! Our team will get back to you within one business day.");
    setForm({ name: "", email: "", phone: "", subject: "", message: "" });
  }

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Contact"
        title="Let's talk about your growth"
        description="Send us a message or book a discovery call — we reply within one business day."
      />
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          {DETAILS.map((d) => (
            <Card key={d.label} className="flex items-start gap-4 p-5">
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand/12 text-brand">
                <d.icon className="size-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {d.label}
                </p>
                <p className="mt-0.5 font-semibold text-navy">{d.value}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-7 shadow-card">
          <h2 className="font-display text-xl font-bold text-navy">Send an enquiry</h2>
          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                maxLength={80}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cemail">Email</Label>
              <Input
                id="cemail"
                type="email"
                value={form.email}
                maxLength={255}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cphone">Phone</Label>
              <Input
                id="cphone"
                type="tel"
                value={form.phone}
                maxLength={20}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={form.subject}
                maxLength={120}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                rows={5}
                value={form.message}
                maxLength={1000}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
              />
            </div>
            <Button type="submit" variant="brand" className="sm:col-span-2">
              <Send /> Send message
            </Button>
          </form>
        </Card>
      </section>
    </SiteLayout>
  );
}
