'use client';
import { useState, useEffect } from 'react';
import { Device } from '@twilio/voice-sdk';

export default function WorkspaceDialpadClient({ lang }: { lang: string }) {
  const [device, setDevice] = useState<Device | null>(null);
  const [callStatus, setCallStatus] = useState<string>('Connecting...');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [activeCall, setActiveCall] = useState<any>(null);

  useEffect(() => {
    fetch('/api/twilio/token')
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          const newDevice = new Device(data.token, {
            codecPreferences: [Device.Codec.Opus, Device.Codec.PCMU],
          });

          newDevice.register();
          newDevice.on('registered', () => setCallStatus('Ready'));
          newDevice.on('error', (err) => {
            console.error('Twilio Device Error:', err);
            setCallStatus('Error');
          });

          setDevice(newDevice);
        } else {
          setCallStatus('Offline');
        }
      })
      .catch((err) => {
        console.error('Failed to load Twilio token:', err);
        setCallStatus('Offline');
      });
  }, []);

  const handleDigitPress = (digit: string) => {
    setPhoneNumber((prev) => prev + digit);
  };

  const handleCall = async () => {
    if (!device || !phoneNumber) return;
    try {
      setCallStatus('Calling...');
      const call = await device.connect({ params: { To: phoneNumber } });
      setActiveCall(call);
      setCallStatus('In Call');

      call.on('disconnect', () => {
        setCallStatus('Ready');
        setActiveCall(null);
      });
    } catch (err) {
      console.error('Call failed:', err);
      setCallStatus('Ready');
    }
  };

  const handleHangup = () => {
    if (activeCall) {
      activeCall.disconnect();
      setActiveCall(null);
      setCallStatus('Ready');
    }
  };

  return (
    <div className="w-80 border-l border-stone-200 bg-stone-50 flex flex-col p-4 justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
          <h3 className="font-bold text-stone-900 text-sm">
            {lang === 'ar' ? 'لوحة الاتصال الهاتفي' : 'Telephony Dialpad'}
          </h3>
          <span
            className={`w-2.5 h-2.5 rounded-full ${callStatus === 'Ready' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
            title={`Status: ${callStatus}`}
          ></span>
        </div>

        <div className="bg-white border border-stone-300 rounded-xl p-3 mb-4 shadow-inner flex justify-between items-center">
          <span className="text-[10px] text-stone-400 font-mono">{callStatus}</span>
          <span className="text-lg font-mono font-bold text-stone-900 tracking-wider overflow-x-auto text-right">
            {phoneNumber || '+966 5...'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitPress(digit)}
              className="bg-white border border-stone-200 hover:bg-orange-50 hover:border-[#FF7A00] hover:text-[#FF7A00] text-stone-800 font-bold py-3 rounded-xl text-base shadow-sm transition active:scale-95"
            >
              {digit}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 mt-4">
        {callStatus !== 'In Call' ? (
          <button
            onClick={handleCall}
            disabled={!phoneNumber}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs transition shadow cursor-pointer"
          >
            {lang === 'ar' ? 'اتصال' : 'Dial / Call'}
          </button>
        ) : (
          <button
            onClick={handleHangup}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-xl text-xs transition shadow cursor-pointer"
          >
            {lang === 'ar' ? 'إنهاء المكالمة' : 'End Call'}
          </button>
        )}
        <button
          onClick={() => setPhoneNumber('')}
          className="w-full bg-stone-200 hover:bg-stone-300 text-stone-700 font-medium py-2 rounded-xl text-xs transition"
        >
          {lang === 'ar' ? 'مسح الرقم' : 'Clear'}
        </button>
      </div>
    </div>
  );
}