/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  ShoppingBag, 
  Zap, 
  CreditCard, 
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FinancialEntry } from './types';

const today = new Date();

// Triggering re-build to fix 404 issue
export default function App() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('');
  const [type, setType] = useState('venda');
  const [income, setIncome] = useState('');
  const [expense, setExpense] = useState('');
  const [secondaryIncome, setSecondaryIncome] = useState('');
  const [secondaryExpense, setSecondaryExpense] = useState('');
  const [tertiaryIncome, setTertiaryIncome] = useState('');
  const [tertiaryExpense, setTertiaryExpense] = useState('');
  const [currency, setCurrency] = useState('R$');
  const [secondaryCurrency, setSecondaryCurrency] = useState('$');
  const [tertiaryCurrency, setTertiaryCurrency] = useState('€');
  const [vendaRates, setVendaRates] = useState<{ [key: string]: string }>(() => {
    const saved = localStorage.getItem('financial_venda_rates');
    return saved ? JSON.parse(saved) : {
      '$': '5,00',
      '€': '5,40',
      '£': '6,30',
      'د.إ': '1,36',
    };
  });
  const [compraRates, setCompraRates] = useState<{ [key: string]: string }>(() => {
    const saved = localStorage.getItem('financial_compra_rates');
    return saved ? JSON.parse(saved) : {
      '$': '5,00',
      '€': '5,40',
      '£': '6,30',
      'د.إ': '1,36',
    };
  });

  useEffect(() => {
    localStorage.setItem('financial_venda_rates', JSON.stringify(vendaRates));
  }, [vendaRates]);

  useEffect(() => {
    localStorage.setItem('financial_compra_rates', JSON.stringify(compraRates));
  }, [compraRates]);

  const getRateValue = (symbol: string, opType?: string) => {
    if (symbol === 'R$') return 1;
    const currentType = opType || type;
    const currentRates = currentType === 'venda' ? vendaRates : compraRates;
    const rateStr = currentRates[symbol];
    if (!rateStr) return 0;
    const num = parseFloat(rateStr.replace(',', '.'));
    return isNaN(num) ? 0 : num;
  };

  const calculateConversion = (value: string, fromSymbol: string, toSymbol: string, opType?: string) => {
    if (!value) return '';
    const num = parseFloat(value.replace(',', '.'));
    if (isNaN(num)) return '';
    
    const fromRate = getRateValue(fromSymbol, opType);
    const toRate = getRateValue(toSymbol, opType);
    
    if (fromRate === 0 || toRate === 0) return '';
    
    const result = (num * fromRate) / toRate;
    return result.toFixed(2).replace('.', ',');
  };

  // Calculation: Primary -> Secondary
  useEffect(() => {
    const sourceValue = type === 'venda' ? income : expense;
    const result = calculateConversion(sourceValue, currency, secondaryCurrency, type);
    if (type === 'venda') setSecondaryIncome(result);
    else setSecondaryExpense(result);
  }, [income, expense, vendaRates, compraRates, currency, secondaryCurrency, type]);

  // Calculation: Secondary -> Tertiary
  useEffect(() => {
    const sourceValue = type === 'venda' ? secondaryIncome : secondaryExpense;
    const result = calculateConversion(sourceValue, secondaryCurrency, tertiaryCurrency, type);
    if (type === 'venda') setTertiaryIncome(result);
    else setTertiaryExpense(result);
  }, [secondaryIncome, secondaryExpense, vendaRates, compraRates, secondaryCurrency, tertiaryCurrency, type]);

  const [entries, setEntries] = useState<FinancialEntry[]>(() => {
    const saved = localStorage.getItem('financial_entries');
    return saved ? JSON.parse(saved) : [];
  });
  const [nextSequence, setNextSequence] = useState(() => {
    const saved = localStorage.getItem('financial_next_sequence');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    localStorage.setItem('financial_entries', JSON.stringify(entries));
    localStorage.setItem('financial_next_sequence', nextSequence.toString());
  }, [entries, nextSequence]);

  // Migration: Ensure all entries have amountInBRL
  useEffect(() => {
    const needsMigration = entries.some(e => e.amountInBRL === undefined);
    if (needsMigration) {
      const migrated = entries.map(e => {
        if (e.amountInBRL === undefined) {
          const rate = getRateValue(e.currency || 'R$', e.type);
          return { ...e, amountInBRL: e.amount * rate };
        }
        return e;
      });
      setEntries(migrated);
    }
  }, []); // Only run once on mount

  const handleSave = () => {
    const amountStr = type === 'venda' ? income : expense;
    // Remove thousands separator (dots) and replace decimal separator (comma) with dot
    const cleanAmountStr = amountStr.replace(/\./g, '').replace(',', '.');
    const amount = parseFloat(cleanAmountStr);
    
    if (isNaN(amount) || amount <= 0 || !customerName) {
      alert('Por favor, preencha o nome do cliente e um valor válido maior que zero.');
      return;
    }

    const [year, month, day] = date.split('-').map(Number);
    const operationDate = new Date(year, month - 1, day);
    const formattedDate = operationDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
    const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newEntry: FinancialEntry = {
      id: Math.random().toString(36).substr(2, 9),
      sequenceNumber: nextSequence,
      type: type as 'venda' | 'compra',
      description: `${type === 'venda' ? 'Venda' : 'Compra'} - ${customerName}`,
      date: `${formattedDate}, ${currentTime}`,
      amount: amount,
      amountInBRL: amount * getRateValue(currency, type),
      currency: currency,
      isIncome: type === 'venda',
    };

    setEntries([newEntry, ...entries]);
    setNextSequence(prev => prev + 1);
    
    // Reset fields
    setCustomerName('');
    setIncome('');
    setExpense('');
    setSecondaryIncome('');
    setSecondaryExpense('');
    setTertiaryIncome('');
    setTertiaryExpense('');
  };

  const currencies = [
    { label: 'Real', symbol: 'R$' },
    { label: 'Dólar', symbol: '$' },
    { label: 'Euro', symbol: '€' },
    { label: 'Libra', symbol: '£' },
    { label: 'Dirham', symbol: 'د.إ' },
  ];

  return (
    <div className="min-h-screen bg-[#10131a] text-[#e0e2ec] font-sans pb-12 selection:bg-primary/30">
      {/* Top App Bar */}
      <header className="sticky top-0 z-50 bg-[#10131a]/80 backdrop-blur-md flex items-center justify-center px-6 py-4 border-b border-[#1d2027]">
        <h1 className="font-bold text-xl tracking-[0.2em] text-white uppercase">Aloito</h1>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8 space-y-10">
        {/* Form Section */}
        <section className="space-y-6">
          {/* Date Picker */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#c1c6d6] px-1">Data</label>
            <div className="relative group">
              <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#191c23] border-none rounded-xl p-4 text-white focus:ring-2 focus:ring-[#adc7ff] transition-all outline-none appearance-none"
              />
              <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8b909f] pointer-events-none" size={20} />
            </div>
          </div>

          {/* Customer Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#c1c6d6] px-1">Nome do Cliente</label>
            <input 
              type="text"
              placeholder="Digite o nome do cliente"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-[#191c23] border-none rounded-xl p-4 text-white focus:ring-2 focus:ring-[#adc7ff] transition-all outline-none placeholder:text-[#414754]"
            />
          </div>

          {/* Type Selection Buttons */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#c1c6d6] px-1">Tipo de Lançamento</label>
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setType('venda')}
                className={`py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  type === 'venda' 
                    ? 'bg-[#adc7ff] text-[#10131a] shadow-lg shadow-blue-500/20' 
                    : 'bg-[#191c23] text-[#8b909f] hover:bg-[#1d2027]'
                }`}
              >
                <ShoppingBag size={20} />
                Venda
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setType('compra')}
                className={`py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  type === 'compra' 
                    ? 'bg-[#ffb691] text-[#10131a] shadow-lg shadow-orange-500/20' 
                    : 'bg-[#191c23] text-[#8b909f] hover:bg-[#1d2027]'
                }`}
              >
                <CreditCard size={20} />
                Compra
              </motion.button>
            </div>
          </div>

          {/* Currency Inputs (Conditional) */}
          <div className="min-h-[100px]">
            <AnimatePresence mode="wait">
              {type === 'venda' && (
                <motion.div 
                  key="venda-input"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  <div className="flex justify-end items-center px-1">
                    <div className="flex gap-1">
                      {currencies.map((curr) => (
                        <button
                          key={curr.symbol}
                          onClick={() => setCurrency(curr.symbol)}
                          className={`text-[10px] px-2 py-1 rounded-full font-bold transition-all ${
                            currency === curr.symbol 
                              ? 'bg-[#adc7ff] text-[#10131a]' 
                              : 'bg-[#1d2027] text-[#8b909f] hover:text-[#c1c6d6]'
                          }`}
                        >
                          {curr.symbol}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-[#191c23] rounded-xl p-4 flex items-center gap-2 focus-within:ring-2 focus-within:ring-[#adc7ff] transition-all">
                    <span className="text-[#adc7ff] font-bold min-w-[24px]">{currency}</span>
                    <input 
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={income}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9,.]/g, '');
                        setIncome(val);
                      }}
                      className="w-full bg-transparent border-none p-0 focus:ring-0 text-white font-semibold placeholder:text-[#414754]"
                    />
                  </div>

                  {/* Secondary Value Input */}
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-end items-center px-1">
                      <div className="flex gap-1">
                        {currencies.map((curr) => (
                          <button
                            key={`sec-${curr.symbol}`}
                            onClick={() => setSecondaryCurrency(curr.symbol)}
                            className={`text-[10px] px-2 py-1 rounded-full font-bold transition-all ${
                              secondaryCurrency === curr.symbol 
                                ? 'bg-[#adc7ff] text-[#10131a]' 
                                : 'bg-[#1d2027] text-[#8b909f] hover:text-[#c1c6d6]'
                            }`}
                          >
                            {curr.symbol}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#191c23] rounded-xl p-4 flex items-center gap-2 focus-within:ring-2 focus-within:ring-[#adc7ff] transition-all opacity-80">
                      <span className="text-[#adc7ff] font-bold min-w-[24px]">{secondaryCurrency}</span>
                      <input 
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={secondaryIncome}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9,.]/g, '');
                          setSecondaryIncome(val);
                        }}
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-white font-semibold placeholder:text-[#414754]"
                      />
                    </div>
                  </div>

                  {/* Tertiary Value Input */}
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-end items-center px-1">
                      <div className="flex gap-1">
                        {currencies.map((curr) => (
                          <button
                            key={`ter-${curr.symbol}`}
                            onClick={() => setTertiaryCurrency(curr.symbol)}
                            className={`text-[10px] px-2 py-1 rounded-full font-bold transition-all ${
                              tertiaryCurrency === curr.symbol 
                                ? 'bg-[#adc7ff] text-[#10131a]' 
                                : 'bg-[#1d2027] text-[#8b909f] hover:text-[#c1c6d6]'
                            }`}
                          >
                            {curr.symbol}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#191c23] rounded-xl p-4 flex items-center gap-2 focus-within:ring-2 focus-within:ring-[#adc7ff] transition-all opacity-60">
                      <span className="text-[#adc7ff] font-bold min-w-[24px]">{tertiaryCurrency}</span>
                      <input 
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={tertiaryIncome}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9,.]/g, '');
                          setTertiaryIncome(val);
                        }}
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-white font-semibold placeholder:text-[#414754]"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
              {type === 'compra' && (
                <motion.div 
                  key="compra-input"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  <div className="flex justify-end items-center px-1">
                    <div className="flex gap-1">
                      {currencies.map((curr) => (
                        <button
                          key={curr.symbol}
                          onClick={() => setCurrency(curr.symbol)}
                          className={`text-[10px] px-2 py-1 rounded-full font-bold transition-all ${
                            currency === curr.symbol 
                              ? 'bg-[#ffb691] text-[#10131a]' 
                              : 'bg-[#1d2027] text-[#8b909f] hover:text-[#c1c6d6]'
                          }`}
                        >
                          {curr.symbol}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-[#191c23] rounded-xl p-4 flex items-center gap-2 focus-within:ring-2 focus-within:ring-[#ffb691] transition-all">
                    <span className="text-[#ffb691] font-bold min-w-[24px]">{currency}</span>
                    <input 
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={expense}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9,.]/g, '');
                        setExpense(val);
                      }}
                      className="w-full bg-transparent border-none p-0 focus:ring-0 text-white font-semibold placeholder:text-[#414754]"
                    />
                  </div>

                  {/* Secondary Value Input */}
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-end items-center px-1">
                      <div className="flex gap-1">
                        {currencies.map((curr) => (
                          <button
                            key={`sec-${curr.symbol}`}
                            onClick={() => setSecondaryCurrency(curr.symbol)}
                            className={`text-[10px] px-2 py-1 rounded-full font-bold transition-all ${
                              secondaryCurrency === curr.symbol 
                                ? 'bg-[#ffb691] text-[#10131a]' 
                                : 'bg-[#1d2027] text-[#8b909f] hover:text-[#c1c6d6]'
                            }`}
                          >
                            {curr.symbol}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#191c23] rounded-xl p-4 flex items-center gap-2 focus-within:ring-2 focus-within:ring-[#ffb691] transition-all opacity-80">
                      <span className="text-[#ffb691] font-bold min-w-[24px]">{secondaryCurrency}</span>
                      <input 
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={secondaryExpense}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9,.]/g, '');
                          setSecondaryExpense(val);
                        }}
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-white font-semibold placeholder:text-[#414754]"
                      />
                    </div>
                  </div>

                  {/* Tertiary Value Input */}
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-end items-center px-1">
                      <div className="flex gap-1">
                        {currencies.map((curr) => (
                          <button
                            key={`ter-${curr.symbol}`}
                            onClick={() => setTertiaryCurrency(curr.symbol)}
                            className={`text-[10px] px-2 py-1 rounded-full font-bold transition-all ${
                              tertiaryCurrency === curr.symbol 
                                ? 'bg-[#ffb691] text-[#10131a]' 
                                : 'bg-[#1d2027] text-[#8b909f] hover:text-[#c1c6d6]'
                            }`}
                          >
                            {curr.symbol}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#191c23] rounded-xl p-4 flex items-center gap-2 focus-within:ring-2 focus-within:ring-[#ffb691] transition-all opacity-60">
                      <span className="text-[#ffb691] font-bold min-w-[24px]">{tertiaryCurrency}</span>
                      <input 
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={tertiaryExpense}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9,.]/g, '');
                          setTertiaryExpense(val);
                        }}
                        className="w-full bg-transparent border-none p-0 focus:ring-0 text-white font-semibold placeholder:text-[#414754]"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Exchange Rates Section */}
          <div className="space-y-3 pt-4">
            <label className="block text-[10px] uppercase tracking-[0.2em] text-[#8b909f] font-bold px-1">Cotação do Dia</label>
            <div className="grid grid-cols-4 gap-2">
              {currencies.filter(c => c.symbol !== 'R$').map((curr) => (
                <div key={`rate-${curr.symbol}`} className={`bg-[#191c23] rounded-xl p-2 flex flex-col items-center gap-1 border border-[#1d2027] transition-all ${type === 'venda' ? 'focus-within:border-[#adc7ff]/30' : 'focus-within:border-[#ffb691]/30'}`}>
                  <span className={`text-[10px] font-bold ${type === 'venda' ? 'text-[#adc7ff]' : 'text-[#ffb691]'}`}>{curr.symbol}</span>
                  <input 
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={type === 'venda' ? vendaRates[curr.symbol] : compraRates[curr.symbol]}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9,.]/g, '');
                      if (type === 'venda') {
                        setVendaRates(prev => ({ ...prev, [curr.symbol]: val }));
                      } else {
                        setCompraRates(prev => ({ ...prev, [curr.symbol]: val }));
                      }
                    }}
                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-white text-center text-xs font-semibold placeholder:text-[#414754]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <motion.button 
            onClick={handleSave}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 bg-gradient-to-br from-[#adc7ff] to-[#1a73e8] text-white font-bold rounded-full shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-4"
          >
            <CheckCircle2 size={20} />
            Salvar Lançamento
          </motion.button>
        </section>

        {/* History */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-lg font-bold text-white">Histórico</h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="text-[#adc7ff] text-xs font-bold bg-[#191c23] px-3 py-1.5 rounded-full border border-[#1d2027] hover:bg-[#1d2027] transition-all flex items-center gap-1.5"
              >
                {sortOrder === 'desc' ? 'Mais recentes' : 'Mais antigos'}
                <ChevronDown size={14} className={`transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
              </button>
              <button className="text-[#adc7ff] text-sm font-medium hover:underline underline-offset-4">Ver tudo</button>
            </div>
          </div>
          
          <div className="space-y-3">
            {[...entries]
              .sort((a, b) => sortOrder === 'desc' ? b.sequenceNumber - a.sequenceNumber : a.sequenceNumber - b.sequenceNumber)
              .filter(entry => ['venda', 'compra'].includes(entry.type)).map((entry, index) => (
              <motion.div 
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-[#191c23] hover:bg-[#1d2027] transition-colors p-4 rounded-2xl flex items-center justify-between group border-l-4 ${entry.isIncome ? 'border-[#adc7ff]' : 'border-[#ffb691]'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center relative ${entry.isIncome ? 'bg-[#adc7ff]/10 text-[#adc7ff]' : 'bg-[#ffb691]/10 text-[#ffb691]'}`}>
                    {entry.type === 'venda' ? <ShoppingBag size={20} /> : entry.type === 'custo_fixo' ? <Zap size={20} /> : <CreditCard size={20} />}
                    <span className="absolute -top-1 -left-1 bg-[#10131a] text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#1d2027] text-[#8b909f]">
                      #{entry.sequenceNumber}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-white group-hover:text-[#adc7ff] transition-colors">{entry.description}</p>
                    <p className="text-xs text-[#8b909f]">{entry.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-bold ${entry.isIncome ? 'text-[#adc7ff]' : 'text-[#ffb691]'}`}>
                    {entry.isIncome ? '+' : '-'} {entry.currency || 'R$'} {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-[10px] text-[#8b909f] font-medium">
                    R$ {(entry.amountInBRL || (entry.amount * getRateValue(entry.currency || 'R$', entry.type))).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
