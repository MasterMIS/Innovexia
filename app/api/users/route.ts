import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, createUser, updateUser, deleteUser } from '@/lib/sheets';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const users = await getAllUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, phone, roleName, imageUrl } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const userData = {
      username,
      email,
      password,
      phone: phone || '',
      roleName: roleName || 'User',
      imageUrl: imageUrl || '',
      
      // Personal Details
      dob: body.dob || '',
      uanNumber: body.uanNumber || '',
      aadhaarNumber: body.aadhaarNumber || '',
      panNumber: body.panNumber || '',
      
      // Address Details
      presentAddressLine1: body.presentAddressLine1 || '',
      presentAddressLine2: body.presentAddressLine2 || '',
      presentCity: body.presentCity || '',
      presentCountry: body.presentCountry || '',
      presentState: body.presentState || '',
      presentPostalCode: body.presentPostalCode || '',
      permanentSameAsPresent: body.permanentSameAsPresent || false,
      permanentAddressLine1: body.permanentAddressLine1 || '',
      permanentAddressLine2: body.permanentAddressLine2 || '',
      permanentCity: body.permanentCity || '',
      permanentCountry: body.permanentCountry || '',
      permanentState: body.permanentState || '',
      permanentPostalCode: body.permanentPostalCode || '',
      
      // Professional Details
      experience: body.experience || '',
      sourceOfHire: body.sourceOfHire || '',
      skillSet: body.skillSet || '',
      highestQualification: body.highestQualification || '',
      additionalInformation: body.additionalInformation || '',
      location: body.location || '',
      title: body.title || '',
      currentSalary: body.currentSalary || '',
      department: body.department || '',
      offerLetterUrl: body.offerLetterUrl || '',
      tentativeJoiningDate: body.tentativeJoiningDate || '',
      
      // Education and Experience (JSON strings)
      education: body.education || '[]',
      workExperience: body.workExperience || '[]',
    };

    const user = await createUser(userData);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email, phone, roleName, imageUrl, password } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const userData: any = {
      email,
      phone,
      roleName: roleName || 'User',
      imageUrl,
      
      // Personal Details
      dob: body.dob,
      uanNumber: body.uanNumber,
      aadhaarNumber: body.aadhaarNumber,
      panNumber: body.panNumber,
      
      // Address Details
      presentAddressLine1: body.presentAddressLine1,
      presentAddressLine2: body.presentAddressLine2,
      presentCity: body.presentCity,
      presentCountry: body.presentCountry,
      presentState: body.presentState,
      presentPostalCode: body.presentPostalCode,
      permanentSameAsPresent: body.permanentSameAsPresent,
      permanentAddressLine1: body.permanentAddressLine1,
      permanentAddressLine2: body.permanentAddressLine2,
      permanentCity: body.permanentCity,
      permanentCountry: body.permanentCountry,
      permanentState: body.permanentState,
      permanentPostalCode: body.permanentPostalCode,
      
      // Professional Details
      experience: body.experience,
      sourceOfHire: body.sourceOfHire,
      skillSet: body.skillSet,
      highestQualification: body.highestQualification,
      additionalInformation: body.additionalInformation,
      location: body.location,
      title: body.title,
      currentSalary: body.currentSalary,
      department: body.department,
      offerLetterUrl: body.offerLetterUrl,
      tentativeJoiningDate: body.tentativeJoiningDate,
      
      // Education and Experience
      education: body.education,
      workExperience: body.workExperience,
    };

    // Only update password if provided
    if (password) {
      userData.password = password;
    }

    const user = await updateUser(parseInt(id), userData);
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    await deleteUser(parseInt(id));
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error instanceof Error && error.message === 'User not found') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
