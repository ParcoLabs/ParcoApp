import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SumsubWebSdk from '@sumsub/websdk-react';
import { useSumsubKyc } from '../hooks/useSumsubKyc';

type KYCStep = 'intro' | 'identity' | 'phone' | 'otp' | 'address' | 'document_type' | 'scan_front' | 'scan_back' | 'review' | 'sumsub_verify';

export const KYC: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<KYCStep>('intro');
  const [loading, setLoading] = useState(false);
  const [showSumsubWidget, setShowSumsubWidget] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);

  const {
    token: sumsubToken,
    loading: sumsubLoading,
    error: sumsubError,
    kycStatus,
    config: sumsubConfig,
    initSumsub,
    refreshToken,
    startPolling,
    stopPolling,
  } = useSumsubKyc();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    otp: '',
    address: '',
    city: '',
    zip: '',
    docType: ''
  });

  const nextStep = (target: KYCStep) => {
    setLoading(true);
    setTimeout(() => {
        setStep(target);
        setLoading(false);
    }, 400);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleStartSumsubVerification = useCallback(async () => {
    setLoading(true);
    const token = await initSumsub();
    if (token) {
      setShowSumsubWidget(true);
    }
    setLoading(false);
  }, [initSumsub]);

  const handleSumsubMessage = useCallback((type: string, payload: any) => {
    console.log('Sumsub message:', type, payload);
    
    if (type === 'idCheck.onApplicantSubmitted') {
      setVerificationComplete(true);
      startPolling((status) => {
        if (status.status === 'APPROVED' || status.status === 'REJECTED') {
          stopPolling();
          setShowSumsubWidget(false);
          nextStep('review');
        }
      });
    }
    
    if (type === 'idCheck.onStepCompleted') {
      console.log('Step completed:', payload);
    }
  }, [startPolling, stopPolling]);

  const handleSumsubError = useCallback((error: any) => {
    console.error('Sumsub error:', error);
  }, []);

  const accessTokenExpirationHandler = useCallback(async () => {
    try {
      const newToken = await refreshToken();
      return newToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return '';
    }
  }, [refreshToken]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const statusIcon = kycStatus?.status === 'APPROVED' 
    ? 'fa-solid fa-check' 
    : kycStatus?.status === 'REJECTED' 
      ? 'fa-solid fa-xmark'
      : 'fa-solid fa-clock';
  
  const statusColor = kycStatus?.status === 'APPROVED'
    ? 'bg-brand-medium'
    : kycStatus?.status === 'REJECTED'
      ? 'bg-red-500'
      : 'bg-yellow-500';
  
  const statusTitle = kycStatus?.status === 'APPROVED'
    ? 'Verification Complete'
    : kycStatus?.status === 'REJECTED'
      ? 'Verification Failed'
      : 'Verification Pending';
  
  const statusMessage = kycStatus?.status === 'APPROVED'
    ? `Congratulations ${formData.firstName}! Your identity has been verified. You can now trade on Parco.`
    : kycStatus?.status === 'REJECTED'
      ? `Sorry ${formData.firstName}, we couldn't verify your identity. Please try again or contact support.`
      : `Thanks ${formData.firstName}! We are reviewing your documents. This usually takes less than 2 minutes.`;

  return (
    <div className="min-h-screen bg-brand-offWhite p-6 pb-20">
      {step === 'intro' && (
        <div className="max-w-md mx-auto">
            <h1 className="text-xl font-bold text-center mb-8 text-brand-dark">Account Level</h1>
            
            <div className="bg-white p-6 rounded-2xl border border-brand-lightGray mb-6">
                <div className="space-y-4 text-sm text-brand-dark font-medium">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <i className="fa-solid fa-qrcode text-blue-400"></i>
                            <span>Receive digital currency</span>
                        </div>
                        <span className="text-brand-sage">Enabled</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <i className="fa-solid fa-paper-plane text-blue-500"></i>
                            <span>Send digital currency</span>
                        </div>
                        <span className="text-brand-sage">Enabled</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <i className="fa-solid fa-rotate text-blue-300"></i>
                            <span>Trade digital currency</span>
                        </div>
                        <span className="text-brand-sage">Disabled</span>
                    </div>
                </div>
            </div>

            <h2 className="font-bold text-brand-dark mb-6">Account Levels</h2>

            <div className="flex gap-4 mb-8">
                <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-brand-medium flex items-center justify-center text-white">
                        <i className="fa-solid fa-check text-sm"></i>
                    </div>
                    <div className="w-0.5 h-full bg-brand-medium my-1"></div>
                </div>
                <div className="pb-6">
                    <p className="text-xs font-bold text-brand-dark mb-1">Verified</p>
                    <h3 className="text-2xl font-bold text-brand-dark mb-2">Level 1</h3>
                    <p className="text-brand-sage text-sm mb-3">Send and receive digital currency</p>
                    <ul className="space-y-2 text-sm font-medium text-brand-dark">
                        <li className="flex items-center gap-2"><i className="fa-solid fa-check text-brand-medium"></i> Name</li>
                        <li className="flex items-center gap-2"><i className="fa-solid fa-check text-brand-medium"></i> Verify email address</li>
                        <li className="flex items-center gap-2"><i className="fa-solid fa-check text-brand-medium"></i> Accept terms of service</li>
                    </ul>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full border-2 border-brand-lightGray bg-white"></div>
                </div>
                <div>
                    <p className="text-xs font-bold text-brand-sage mb-1">Unverified</p>
                    <h3 className="text-2xl font-bold text-brand-dark mb-2">Level 2</h3>
                    <p className="text-brand-sage text-sm mb-3">Trade digital currency</p>
                    <ul className="space-y-2 text-sm text-brand-sage">
                        <li className="flex items-center gap-2"><i className="fa-solid fa-check text-brand-lightGray"></i> Verify personal information</li>
                        <li className="flex items-center gap-2"><i className="fa-regular fa-circle text-brand-lightGray"></i> Verify photo ID</li>
                    </ul>
                    
                    <button 
                        onClick={() => nextStep('identity')}
                        className="mt-6 bg-brand-deep text-white w-full py-3.5 rounded-full font-bold shadow-md hover:bg-brand-dark transition-all"
                    >
                        Verify Level 2
                    </button>
                </div>
            </div>
        </div>
      )}

      {step === 'identity' && (
        <div className="max-w-md mx-auto">
            <div className="mb-8">
                <button onClick={() => setStep('intro')} className="text-brand-dark mb-4"><i className="fa-solid fa-arrow-left text-xl"></i></button>
                <h1 className="text-2xl font-bold text-brand-dark mb-2">Getting Started</h1>
                <p className="text-brand-sage text-sm">Be sure to enter your legal name as it appears on your government-issued ID.</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); nextStep('phone'); }} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-brand-dark mb-2">Legal First Name</label>
                    <input 
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full border border-brand-sage/50 rounded-lg p-3.5 focus:border-brand-deep focus:ring-1 focus:ring-brand-deep outline-none"
                        placeholder="e.g. John"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-brand-dark mb-2">Legal Last Name</label>
                    <input 
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full border border-brand-sage/50 rounded-lg p-3.5 focus:border-brand-deep focus:ring-1 focus:ring-brand-deep outline-none"
                        placeholder="e.g. Doe"
                        required
                    />
                </div>

                <button type="submit" className="w-full bg-brand-deep text-white py-3.5 rounded-full font-bold mt-8 flex items-center justify-center gap-2">
                    Continue <i className="fa-solid fa-chevron-right text-sm"></i>
                </button>
            </form>
        </div>
      )}

      {step === 'phone' && (
        <div className="max-w-md mx-auto">
            <div className="mb-8">
                <button onClick={() => setStep('identity')} className="text-brand-dark mb-4"><i className="fa-solid fa-arrow-left text-xl"></i></button>
                <h1 className="text-2xl font-bold text-brand-dark mb-2">Phone Number</h1>
                <p className="text-brand-sage text-sm">We'll send a code to verify your phone.</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); nextStep('otp'); }} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-brand-dark mb-2">Mobile Number</label>
                    <input 
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full border border-brand-sage/50 rounded-lg p-3.5 focus:border-brand-deep focus:ring-1 focus:ring-brand-deep outline-none"
                        placeholder="555-0123"
                        type="tel"
                        required
                    />
                </div>

                <button type="submit" className="w-full bg-brand-deep text-white py-3.5 rounded-full font-bold mt-8 flex items-center justify-center gap-2">
                    Send Code <i className="fa-solid fa-chevron-right text-sm"></i>
                </button>
            </form>
        </div>
      )}

      {step === 'otp' && (
        <div className="max-w-md mx-auto">
            <div className="mb-8">
                <button onClick={() => setStep('phone')} className="text-brand-dark mb-4"><i className="fa-solid fa-arrow-left text-xl"></i></button>
                <h1 className="text-xl font-bold text-brand-dark mb-2">Enter the 6-digit code we texted to +x xxx-xxxx</h1>
                <p className="text-brand-sage text-sm">this helps us keep your account secure by verifying that its really you</p>
            </div>

            <div className="flex gap-2 mb-8 justify-between">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <input 
                        key={`otp-${i}`}
                        type="text" 
                        maxLength={1}
                        className="w-12 h-14 border border-brand-sage/50 rounded-lg text-center text-xl font-bold focus:border-brand-deep focus:ring-1 focus:ring-brand-deep outline-none"
                    />
                ))}
            </div>

            <p className="text-center text-sm font-bold text-brand-dark mb-8">Resend Code in 28</p>

            <button 
                onClick={() => nextStep('address')}
                className="w-full bg-brand-deep text-white py-3.5 rounded-full font-bold flex items-center justify-center gap-2"
            >
                Continue <i className="fa-solid fa-chevron-right text-sm"></i>
            </button>
        </div>
      )}

      {step === 'address' && (
        <div className="max-w-md mx-auto">
            <div className="mb-8">
                <button onClick={() => setStep('otp')} className="text-brand-dark mb-4"><i className="fa-solid fa-arrow-left text-xl"></i></button>
                <h1 className="text-2xl font-bold text-brand-dark mb-2">Home Address</h1>
                <p className="text-brand-sage text-sm">Enter the address listed on your ID.</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); nextStep('document_type'); }} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-brand-dark mb-2">Street Address</label>
                    <input 
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full border border-brand-sage/50 rounded-lg p-3.5 focus:border-brand-deep focus:ring-1 focus:ring-brand-deep outline-none"
                        required
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-brand-dark mb-2">City</label>
                        <input 
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            className="w-full border border-brand-sage/50 rounded-lg p-3.5 focus:border-brand-deep focus:ring-1 focus:ring-brand-deep outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-brand-dark mb-2">Zip Code</label>
                        <input 
                            name="zip"
                            value={formData.zip}
                            onChange={handleChange}
                            className="w-full border border-brand-sage/50 rounded-lg p-3.5 focus:border-brand-deep focus:ring-1 focus:ring-brand-deep outline-none"
                            required
                        />
                    </div>
                </div>

                <button type="submit" className="w-full bg-brand-deep text-white py-3.5 rounded-full font-bold mt-8 flex items-center justify-center gap-2">
                    Continue <i className="fa-solid fa-chevron-right text-sm"></i>
                </button>
            </form>
        </div>
      )}

      {step === 'document_type' && (
        <div className="max-w-md mx-auto">
            <div className="mb-8 text-center">
                <button onClick={() => setStep('address')} className="absolute left-4 text-brand-dark"><i className="fa-solid fa-arrow-left text-xl"></i></button>
                <h1 className="text-xl font-bold text-brand-dark mb-2">Verify Your Identity</h1>
                <p className="text-brand-sage font-bold text-sm">Choose your document type</p>
            </div>

            <div className="space-y-4 mt-8">
                {[
                    { id: 'id_card', label: 'Identity Card', icon: 'fa-regular fa-id-card' },
                    { id: 'license', label: 'Drivers License', icon: 'fa-regular fa-id-badge' },
                    { id: 'passport', label: 'Passport', icon: 'fa-solid fa-passport' },
                ].map((doc) => (
                    <button 
                        key={doc.id}
                        onClick={() => { setFormData({...formData, docType: doc.id}); nextStep('scan_front'); }}
                        className="w-full flex items-center gap-4 p-4 border border-brand-lightGray rounded-full hover:bg-brand-offWhite transition-colors text-left"
                    >
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 text-xl">
                            <i className={doc.icon}></i>
                        </div>
                        <span className="font-bold text-brand-dark">{doc.label}</span>
                    </button>
                ))}
            </div>
        </div>
      )}

      {step === 'scan_front' && (
        <div className="max-w-md mx-auto text-center h-full flex flex-col">
            <div className="mb-4">
                <button onClick={() => { setShowSumsubWidget(false); setStep('document_type'); }} className="absolute left-4 text-brand-dark"><i className="fa-solid fa-arrow-left text-xl"></i></button>
                <h1 className="text-xl font-bold text-brand-dark">Verify Your Identity</h1>
            </div>

            {showSumsubWidget && sumsubToken ? (
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 min-h-[400px] bg-white rounded-xl overflow-hidden">
                        <SumsubWebSdk
                            accessToken={sumsubToken}
                            expirationHandler={accessTokenExpirationHandler}
                            config={{
                                lang: 'en',
                                theme: 'light',
                            }}
                            options={{
                                addViewportTag: false,
                                adaptIframeHeight: true,
                            }}
                            onMessage={handleSumsubMessage}
                            onError={handleSumsubError}
                        />
                    </div>
                    {verificationComplete && (
                        <div className="mt-4 p-4 bg-brand-offWhite rounded-xl">
                            <p className="text-brand-sage text-sm">
                                <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                                Verifying your documents...
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <div className="flex-1 flex flex-col justify-center items-center">
                        <h2 className="font-bold text-brand-dark mb-4 text-lg">Scan the Front</h2>
                        <p className="text-brand-sage text-sm mb-8 px-8">Take a photo of the front of your identity card</p>

                        <div className="relative w-64 h-40 border-2 border-brand-medium border-dashed rounded-xl bg-brand-offWhite flex items-center justify-center mb-8">
                            <div className="w-56 h-32 bg-white rounded-lg shadow-sm p-4 flex flex-col gap-2 opacity-50">
                                <div className="w-full flex justify-end"><div className="w-20 h-2 bg-gray-200 rounded"></div></div>
                                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                                <div className="w-32 h-2 bg-gray-200 rounded"></div>
                                <div className="w-24 h-2 bg-gray-200 rounded"></div>
                            </div>
                            
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand-medium -mt-1 -ml-1"></div>
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-brand-medium -mt-1 -mr-1"></div>
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-brand-medium -mb-1 -ml-1"></div>
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand-medium -mb-1 -mr-1"></div>
                        </div>

                        {sumsubError && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-red-600 text-sm">{sumsubError}</p>
                            </div>
                        )}

                        {sumsubConfig?.configured ? (
                            <button 
                                onClick={handleStartSumsubVerification}
                                disabled={loading || sumsubLoading}
                                className="bg-brand-deep text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-brand-dark flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading || sumsubLoading ? (
                                    <><i className="fa-solid fa-spinner fa-spin"></i> Loading...</>
                                ) : (
                                    <><i className="fa-solid fa-camera"></i> Start Verification</>
                                )}
                            </button>
                        ) : (
                            <button 
                                onClick={() => nextStep('scan_back')}
                                className="bg-brand-deep text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-brand-dark flex items-center gap-2"
                            >
                                <i className="fa-solid fa-camera"></i> Take Photo
                            </button>
                        )}
                    </div>
                    
                    {!sumsubConfig?.configured && (
                        <button onClick={() => nextStep('scan_back')} className="w-full bg-brand-medium/20 text-brand-deep font-bold py-3.5 rounded-full mt-auto mb-4">
                            Continue
                        </button>
                    )}
                </>
            )}
        </div>
      )}

      {step === 'scan_back' && (
        <div className="max-w-md mx-auto text-center h-full flex flex-col">
            <div className="mb-4">
                <button onClick={() => setStep('scan_front')} className="absolute left-4 text-brand-dark"><i className="fa-solid fa-arrow-left text-xl"></i></button>
                <h1 className="text-xl font-bold text-brand-dark">Verify Your Identity</h1>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center">
                <h2 className="font-bold text-brand-dark mb-4 text-lg">Scan the Back</h2>
                <p className="text-brand-sage text-sm mb-8 px-8">Take a photo of the back of your identity card</p>

                <div className="relative w-64 h-40 border-2 border-brand-medium border-dashed rounded-xl bg-brand-offWhite flex items-center justify-center mb-8">
                    <div className="w-56 h-32 bg-white rounded-lg shadow-sm p-4 flex flex-col justify-between opacity-50">
                        <div className="w-full h-8 bg-gray-200/50 rounded"></div>
                        <div className="w-32 h-4 bg-gray-200 rounded self-center"></div>
                    </div>
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-brand-medium -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-brand-medium -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-brand-medium -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-brand-medium -mb-1 -mr-1"></div>
                </div>

                <button 
                    onClick={() => nextStep('review')}
                    className="bg-brand-deep text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-brand-dark flex items-center gap-2"
                >
                    <i className="fa-solid fa-camera"></i> Take Photo
                </button>
            </div>

            <button onClick={() => nextStep('review')} className="w-full bg-brand-medium/20 text-brand-deep font-bold py-3.5 rounded-full mt-auto mb-4">
                Continue
            </button>
        </div>
      )}

      {step === 'review' && (
        <div className="max-w-md mx-auto text-center pt-12">
            <div className={`w-20 h-20 ${statusColor} rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-6 shadow-lg`}>
                <i className={statusIcon}></i>
            </div>
            <h1 className="text-2xl font-bold text-brand-dark mb-2">{statusTitle}</h1>
            <p className="text-brand-sage mb-8">{statusMessage}</p>

            <div className="bg-white border border-brand-lightGray rounded-xl p-4 text-left mb-8">
                <h3 className="font-bold text-brand-dark mb-4 border-b border-brand-lightGray pb-2">Submitted Info</h3>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-brand-sage">Name</span>
                        <span className="font-bold text-brand-dark">{formData.firstName} {formData.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-brand-sage">Phone</span>
                        <span className="font-bold text-brand-dark">{formData.phone}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-brand-sage">Document</span>
                        <span className="font-bold text-brand-dark uppercase">{formData.docType.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-brand-sage">Status</span>
                        <span className={`font-bold ${kycStatus?.status === 'APPROVED' ? 'text-brand-medium' : kycStatus?.status === 'REJECTED' ? 'text-red-500' : 'text-yellow-600'}`}>
                            {kycStatus?.status || 'PENDING'}
                        </span>
                    </div>
                </div>
            </div>

            <button 
                onClick={() => navigate('/')} 
                className="w-full bg-brand-deep text-white py-3.5 rounded-full font-bold shadow-md hover:bg-brand-dark"
            >
                Return to Dashboard
            </button>
        </div>
      )}
    </div>
  );
};