import { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { saleAPI } from '../services/api';
import type { PurchaseResponse, PurchaseResult } from '../services/api';

const FlashSale = () => {
    const [purchaseStatus, setPurchaseStatus] = useState<string>('');
    const [orderId, setOrderId] = useState<string>('');

    // Fetch sale status
    const { data: saleStatus, refetch: refetchStatus } = useQuery('saleStatus', saleAPI.getStatus, {
        refetchInterval: 5000, // Refetch every 5 seconds
    });

    // Fetch product details
    const { data: product } = useQuery('product', saleAPI.getProduct);

    // Purchase mutation
    const purchaseMutation = useMutation(
        (productId: string) => saleAPI.attemptPurchase({ productId }),
        {
            onSuccess: (response: { data: PurchaseResponse }) => {
                const { orderId } = response.data;
                setOrderId(orderId);
                setPurchaseStatus('in_progress');
                toast.success('Purchase submitted! Checking status...');
                // Start checking purchase result
                checkPurchaseResult(orderId);
            },
            onError: (error: unknown) => {
                type AxiosErrorLike = { response?: { data?: { error?: string } } };
                const err = error as AxiosErrorLike;
                const errorMessage = err.response?.data?.error || 'Purchase failed';
                setPurchaseStatus('failed');
                toast.error(errorMessage);
            },
        }
    );

    // Check purchase result
    const checkPurchaseMutation = useMutation((orderId: string) => saleAPI.checkPurchase(orderId), {
        onSuccess: (response: { data: PurchaseResult }) => {
            const { message } = response.data;
            if (message.includes('purchased')) {
                setPurchaseStatus('success');
                toast.success('Purchase successful!');
            } else {
                setPurchaseStatus('failed');
                toast.error('Purchase failed');
            }
            refetchStatus();
        },
        onError: () => {
            setPurchaseStatus('failed');
            toast.error('Failed to check purchase status');
        },
    });

    const checkPurchaseResult = (orderId: string) => {
        setTimeout(() => {
            checkPurchaseMutation.mutate(orderId);
        }, 2000); // Check after 2 seconds
    };

    const handlePurchase = () => {
        if (product?.data) {
            purchaseMutation.mutate(product.data.product_id);
        }
    };

    const getStatusDisplay = () => {
        if (!saleStatus?.data) return 'Loading...';

        switch (saleStatus.data.status) {
            case 'upcoming':
                return 'Upcoming';
            case 'active':
                return 'Active';
            case 'ended':
                return 'Ended';
            default:
                return 'Unknown';
        }
    };

    const getPurchaseButtonText = () => {
        if (purchaseMutation.isLoading) return 'Processing...';
        if (purchaseStatus === 'in_progress') return 'Checking...';
        if (purchaseStatus === 'success') return 'Purchased!';
        if (purchaseStatus === 'failed') return 'Try Again';
        return 'Buy Now';
    };

    const isPurchaseDisabled = () => {
        return (
            purchaseMutation.isLoading ||
            purchaseStatus === 'in_progress' ||
            purchaseStatus === 'success' ||
            saleStatus?.data?.status !== 'active' ||
            saleStatus?.data?.remainingStock === 0
        );
    };

    const formatPrice = (priceInCent: number) => {
        return `$${(priceInCent / 100).toFixed(2)}`;
    };

    if (!saleStatus?.data || !product?.data) {
        return (
            <div className="flash-sale-container">
                <div className="product-card">
                    <h2>Loading...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="flash-sale-container">
            <div className={`sale-status ${saleStatus.data.status}`}>
                Sale Status: {getStatusDisplay()}
            </div>

            <div className="product-card">
                <h2>{product.data.name}</h2>
                <div className="stock-info">
                    <p>Price: {formatPrice(product.data.price_in_cent)}</p>
                    <p>Remaining Stock: {saleStatus.data.remainingStock}</p>
                </div>

                {saleStatus.data.status === 'upcoming' && (
                    <div className="countdown">
                        <p>Sale starts in:</p>
                        <p>
                            {formatDistanceToNow(new Date(saleStatus.data.startDate), {
                                addSuffix: true,
                            })}
                        </p>
                    </div>
                )}

                {saleStatus.data.status === 'active' && (
                    <div className="countdown">
                        <p>Sale ends in:</p>
                        <p>
                            {formatDistanceToNow(new Date(saleStatus.data.endDate), {
                                addSuffix: true,
                            })}
                        </p>
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <button
                        className="buy-button"
                        onClick={handlePurchase}
                        disabled={isPurchaseDisabled()}
                    >
                        {getPurchaseButtonText()}
                    </button>
                </div>

                {purchaseStatus === 'success' && (
                    <div style={{ textAlign: 'center', marginTop: '1rem', color: '#10b981' }}>
                        <p>🎉 Congratulations! Your purchase was successful!</p>
                        <p>Order ID: {orderId}</p>
                    </div>
                )}

                {purchaseStatus === 'failed' && (
                    <div style={{ textAlign: 'center', marginTop: '1rem', color: '#ef4444' }}>
                        <p>❌ Purchase failed. Please try again.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FlashSale;
