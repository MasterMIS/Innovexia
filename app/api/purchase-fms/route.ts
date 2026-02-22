import { NextResponse } from 'next/server';
import { getPurchaseFMSOrders, createPurchaseFMSOrder, updatePurchaseFMSOrder, deletePurchaseFMSOrder } from '@/lib/sheets';

export async function GET() {
    try {
        const orders = await getPurchaseFMSOrders();
        return NextResponse.json(orders);
    } catch (error) {
        console.error('Error fetching Purchase FMS orders:', error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const newOrder = await createPurchaseFMSOrder(data);
        return NextResponse.json(newOrder);
    } catch (error) {
        console.error('Error creating Purchase FMS order:', error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const data = await request.json();
        const { id, ...updateData } = data;
        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }
        const updatedOrder = await updatePurchaseFMSOrder(parseInt(id), updateData);
        return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error('Error updating Purchase FMS order:', error);
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }
        await deletePurchaseFMSOrder(parseInt(id));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting Purchase FMS order:', error);
        return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
    }
}
