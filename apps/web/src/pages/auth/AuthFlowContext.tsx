import React, { createContext, useCallback, useContext, useState } from 'react';

interface AuthFlowState {
  mnemonic: string;
  flowType: 'create' | 'recover';
  justCreated: boolean;
}

interface AuthFlowContextValue extends AuthFlowState {
  setMnemonic: (m: string) => void;
  setFlowType: (t: 'create' | 'recover') => void;
  setJustCreated: (v: boolean) => void;
  reset: () => void;
}

const AuthFlowContext = createContext<AuthFlowContextValue | null>(null);

export function AuthFlowProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthFlowState>({
    mnemonic: '',
    flowType: 'create',
    justCreated: false,
  });

  const setMnemonic = useCallback((mnemonic: string) => {
    setState((s) => ({ ...s, mnemonic }));
  }, []);

  const setFlowType = useCallback((flowType: 'create' | 'recover') => {
    setState((s) => ({ ...s, flowType }));
  }, []);

  const setJustCreated = useCallback((justCreated: boolean) => {
    setState((s) => ({ ...s, justCreated }));
  }, []);

  const reset = useCallback(() => {
    setState({ mnemonic: '', flowType: 'create', justCreated: false });
  }, []);

  return (
    <AuthFlowContext.Provider value={{ ...state, setMnemonic, setFlowType, setJustCreated, reset }}>
      {children}
    </AuthFlowContext.Provider>
  );
}

export function useAuthFlow(): AuthFlowContextValue {
  const ctx = useContext(AuthFlowContext);
  if (!ctx) throw new Error('useAuthFlow must be used within AuthFlowProvider');
  return ctx;
}
