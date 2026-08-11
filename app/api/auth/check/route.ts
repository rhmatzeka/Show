import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-brutalist-key-change-me";

export async function GET(request: NextRequest) {
  const tokenCookie = request.cookies.get("admin_token");

  if (!tokenCookie) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(tokenCookie.value, JWT_SECRET);
    if (decoded && typeof decoded === "object" && decoded.username === "admin") {
      return NextResponse.json({ authenticated: true });
    }
    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
