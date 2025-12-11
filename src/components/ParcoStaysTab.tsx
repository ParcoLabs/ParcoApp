import React, { useState } from 'react';
import { Property } from '../types';

interface ParcoStaysTabProps {
  property: Property;
  isHolder: boolean;
  tokensOwned: number;
}

interface BookingDetails {
  checkIn: Date;
  checkOut: Date;
  guests: number;
}

const NIGHTLY_RATE = 285;
const CLEANING_FEE = 95;
const SERVICE_FEE_PERCENT = 0.12;

const ParcoStaysTab: React.FC<ParcoStaysTabProps> = ({ property, isHolder, tokensOwned }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<{ checkIn: Date | null; checkOut: Date | null }>({
    checkIn: null,
    checkOut: null
  });
  const [guests, setGuests] = useState(2);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const annualYieldPerToken = (property.tokenPrice * property.rentalYield) / 100;
  const tokenHolderCredit = tokensOwned * annualYieldPerToken;

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (clickedDate < today) return;

    if (!selectedDates.checkIn || (selectedDates.checkIn && selectedDates.checkOut)) {
      setSelectedDates({ checkIn: clickedDate, checkOut: null });
    } else {
      if (clickedDate > selectedDates.checkIn) {
        setSelectedDates({ ...selectedDates, checkOut: clickedDate });
      } else {
        setSelectedDates({ checkIn: clickedDate, checkOut: null });
      }
    }
  };

  const isDateSelected = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (!selectedDates.checkIn) return false;
    
    if (selectedDates.checkIn && !selectedDates.checkOut) {
      return date.getTime() === selectedDates.checkIn.getTime();
    }
    
    return date >= selectedDates.checkIn && date <= (selectedDates.checkOut || selectedDates.checkIn);
  };

  const isDateInRange = (day: number) => {
    if (!selectedDates.checkIn || !selectedDates.checkOut) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date > selectedDates.checkIn && date < selectedDates.checkOut;
  };

  const isPastDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const calculateNights = () => {
    if (!selectedDates.checkIn || !selectedDates.checkOut) return 0;
    const diff = selectedDates.checkOut.getTime() - selectedDates.checkIn.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const calculateTotal = () => {
    const nights = calculateNights();
    const subtotal = NIGHTLY_RATE * nights;
    const serviceFee = subtotal * SERVICE_FEE_PERCENT;
    const total = subtotal + CLEANING_FEE + serviceFee;
    const discountedTotal = Math.max(0, total - tokenHolderCredit);
    return { subtotal, serviceFee, total, discountedTotal, nights };
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isPast = isPastDate(day);
      const isSelected = isDateSelected(day);
      const isInRange = isDateInRange(day);
      
      days.push(
        <button
          key={day}
          onClick={() => !isPast && handleDateClick(day)}
          disabled={isPast}
          className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors
            ${isPast ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'cursor-pointer'}
            ${isSelected ? 'bg-brand-deep text-white' : ''}
            ${isInRange ? 'bg-brand-mint/30' : ''}
            ${!isPast && !isSelected && !isInRange ? 'hover:bg-brand-lightGray dark:hover:bg-[#2a2a2a] text-brand-dark dark:text-white' : ''}
          `}
        >
          {day}
        </button>
      );
    }

    return (
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-brand-lightGray dark:border-[#3a3a3a] p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-brand-lightGray dark:hover:bg-[#2a2a2a] rounded-lg">
            <i className="fa-solid fa-chevron-left text-brand-dark dark:text-white"></i>
          </button>
          <h3 className="text-lg font-bold text-brand-dark dark:text-white">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button onClick={nextMonth} className="p-2 hover:bg-brand-lightGray dark:hover:bg-[#2a2a2a] rounded-lg">
            <i className="fa-solid fa-chevron-right text-brand-dark dark:text-white"></i>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="h-10 flex items-center justify-center text-xs font-medium text-brand-sage dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  if (!isHolder) {
    return (
      <div className="bg-gradient-to-br from-brand-mint/20 to-brand-deep/10 dark:from-brand-mint/10 dark:to-brand-deep/5 rounded-xl p-6 border border-brand-mint/30 dark:border-brand-mint/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-brand-deep/10 dark:bg-brand-mint/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-house-chimney-window text-brand-deep dark:text-brand-mint text-xl"></i>
          </div>
          <div>
            <h3 className="text-lg font-bold text-brand-dark dark:text-white mb-2">Parco Stays</h3>
            <p className="text-brand-sage dark:text-gray-400 leading-relaxed">
              Owning tokens in this property gives you access to exclusive booking privileges at this luxury vacation rental. 
              Token holders can book stays at discounted rates, with credits applied based on your rental yield earnings.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <i className="fa-solid fa-tag text-brand-deep dark:text-brand-mint"></i>
              <span className="text-brand-dark dark:text-white font-medium">
                ${NIGHTLY_RATE}/night with holder discounts
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showConfirmation && selectedDates.checkIn && selectedDates.checkOut) {
    const { subtotal, serviceFee, total, discountedTotal, nights } = calculateTotal();

    return (
      <div className="space-y-6">
        <button 
          onClick={() => setShowConfirmation(false)}
          className="flex items-center gap-2 text-brand-sage dark:text-gray-400 hover:text-brand-dark dark:hover:text-white transition-colors"
        >
          <i className="fa-solid fa-arrow-left"></i>
          <span>Back to calendar</span>
        </button>

        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-brand-lightGray dark:border-[#3a3a3a] overflow-hidden">
          <div className="p-4 border-b border-brand-lightGray dark:border-[#3a3a3a]">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-brand-dark dark:text-white">${NIGHTLY_RATE}</span>
              <span className="text-brand-sage dark:text-gray-400">per night</span>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-brand-lightGray dark:border-[#3a3a3a] rounded-lg p-3">
                <p className="text-xs font-medium text-brand-sage dark:text-gray-400 uppercase mb-1">Check-in</p>
                <p className="text-sm font-medium text-brand-dark dark:text-white">{formatDate(selectedDates.checkIn)}</p>
              </div>
              <div className="border border-brand-lightGray dark:border-[#3a3a3a] rounded-lg p-3">
                <p className="text-xs font-medium text-brand-sage dark:text-gray-400 uppercase mb-1">Check-out</p>
                <p className="text-sm font-medium text-brand-dark dark:text-white">{formatDate(selectedDates.checkOut)}</p>
              </div>
            </div>

            <div className="border border-brand-lightGray dark:border-[#3a3a3a] rounded-lg p-3">
              <p className="text-xs font-medium text-brand-sage dark:text-gray-400 uppercase mb-1">Guests</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-dark dark:text-white">{guests} guest{guests > 1 ? 's' : ''}</span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setGuests(Math.max(1, guests - 1))}
                    className="w-8 h-8 rounded-full border border-brand-lightGray dark:border-[#3a3a3a] flex items-center justify-center text-brand-sage dark:text-gray-400 hover:border-brand-dark dark:hover:border-white"
                  >
                    -
                  </button>
                  <button 
                    onClick={() => setGuests(Math.min(6, guests + 1))}
                    className="w-8 h-8 rounded-full border border-brand-lightGray dark:border-[#3a3a3a] flex items-center justify-center text-brand-sage dark:text-gray-400 hover:border-brand-dark dark:hover:border-white"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-brand-lightGray dark:border-[#3a3a3a] space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-brand-sage dark:text-gray-400">${NIGHTLY_RATE} x {nights} nights</span>
              <span className="text-brand-dark dark:text-white">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brand-sage dark:text-gray-400">Cleaning fee</span>
              <span className="text-brand-dark dark:text-white">${CLEANING_FEE.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brand-sage dark:text-gray-400">Service fee</span>
              <span className="text-brand-dark dark:text-white">${serviceFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-brand-deep dark:text-brand-mint">
              <span className="flex items-center gap-1">
                Token holder credit
                <i className="fa-regular fa-circle-info text-xs"></i>
              </span>
              <span>-${Math.min(tokenHolderCredit, total).toFixed(2)}</span>
            </div>
            <div className="pt-3 border-t border-brand-lightGray dark:border-[#3a3a3a] flex justify-between font-bold">
              <span className="text-brand-dark dark:text-white">Total</span>
              <span className="text-brand-deep dark:text-brand-mint">${discountedTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="p-4 border-t border-brand-lightGray dark:border-[#3a3a3a]">
            <button className="w-full bg-brand-deep text-white font-bold py-3.5 rounded-xl hover:bg-brand-dark transition-colors">
              Confirm Booking
            </button>
            <p className="text-center text-xs text-brand-sage dark:text-gray-400 mt-2">You won't be charged yet</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-brand-sage dark:text-gray-400">
          <i className="fa-solid fa-gem text-brand-deep dark:text-brand-mint"></i>
          <span>You're saving <strong className="text-brand-dark dark:text-white">${Math.min(tokenHolderCredit, total).toFixed(2)}</strong> as a token holder</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-brand-mint/20 to-transparent dark:from-brand-mint/10 rounded-xl p-4 border border-brand-mint/30 dark:border-brand-mint/20">
        <div className="flex items-center gap-3">
          <i className="fa-solid fa-house-chimney-window text-brand-deep dark:text-brand-mint"></i>
          <div>
            <p className="text-sm font-medium text-brand-dark dark:text-white">
              You own {tokensOwned} token{tokensOwned > 1 ? 's' : ''} in this property
            </p>
            <p className="text-xs text-brand-sage dark:text-gray-400">
              Your token holder credit: ${tokenHolderCredit.toFixed(2)}/year
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-brand-dark dark:text-white mb-1">Select dates</h3>
        <p className="text-sm text-brand-sage dark:text-gray-400 mb-4">Choose your check-in and check-out dates</p>
        {renderCalendar()}
      </div>

      {selectedDates.checkIn && selectedDates.checkOut && (
        <div className="flex items-center justify-between bg-brand-offWhite dark:bg-[#1a1a1a] rounded-xl p-4 border border-brand-lightGray dark:border-[#3a3a3a]">
          <div>
            <p className="text-sm font-medium text-brand-dark dark:text-white">
              {formatDate(selectedDates.checkIn)} - {formatDate(selectedDates.checkOut)}
            </p>
            <p className="text-xs text-brand-sage dark:text-gray-400">{calculateNights()} nights</p>
          </div>
          <button 
            onClick={() => setShowConfirmation(true)}
            className="bg-brand-deep text-white font-bold px-6 py-2.5 rounded-xl hover:bg-brand-dark transition-colors"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
};

export default ParcoStaysTab;
