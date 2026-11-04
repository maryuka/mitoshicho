import { InputAdornment, TextField, type TextFieldProps } from '@mui/material';
import { useEffect, useState } from 'react';
import { num, parseAmount } from '../lib/money';

type Props = Omit<TextFieldProps, 'value' | 'onChange' | 'placeholder'> & {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: number;
  ariaLabel?: string;
};

/** 金額入力。「12000+3000」のような式も受け付け、確定（フォーカスを外す / Enter）時に計算する */
export function MoneyField({ value, onChange, placeholder, helperText, ariaLabel, ...rest }: Props) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  const [error, setError] = useState(false);
  useEffect(() => setText(value === undefined ? '' : String(value)), [value]);

  const commit = () => {
    const v = parseAmount(text);
    if (v === null) { setError(true); return; }
    setError(false);
    setText(v === undefined ? '' : String(v));
    if (v !== value) onChange(v);
  };

  return (
    <TextField
      {...rest}
      value={text}
      error={error}
      helperText={error ? '数字で入力してください（足し算・引き算も可）' : helperText}
      placeholder={placeholder !== undefined ? num(placeholder) : undefined}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      slotProps={{
        htmlInput: { inputMode: 'numeric', style: { textAlign: 'right' }, 'aria-label': ariaLabel },
        input: { startAdornment: <InputAdornment position="start">¥</InputAdornment> },
      }}
    />
  );
}
