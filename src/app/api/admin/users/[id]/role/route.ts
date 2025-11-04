// src/app/api/admin/users/[id]/role/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import type { UserRole } from '@/types/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if current user is admin
    const currentUser = await getCurrentUser()
    if (!isAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const { role } = await req.json()
    
    if (!role || !['admin', 'curator', 'visitor'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be: admin, curator, or visitor' },
        { status: 400 }
      )
    }

    // Update user role
    const updatedUser = await db.user.update({
      where: { id: params.id },
      data: { role },
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    })

    return NextResponse.json({
      message: 'Role updated successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Role update error:', error)
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    )
  }
}

// Get user details (admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!isAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: params.id },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true, 
        createdAt: true,
        updatedAt: true 
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)

  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}