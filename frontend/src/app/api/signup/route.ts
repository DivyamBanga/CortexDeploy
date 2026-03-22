import { NextRequest, NextResponse } from "next/server";

// For now, proxy to the Express backend if running, or return a placeholder
export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const trimmed = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  // Try to proxy to Express backend
  try {
    const res = await fetch("http://localhost:3001/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    // Express not running — return success placeholder
    return NextResponse.json({ success: true, count: 1 });
  }
}
