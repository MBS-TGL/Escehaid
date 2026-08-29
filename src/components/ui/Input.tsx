interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string;
}

export function Input({ label, required, error, type, ...props }: InputProps) {
  const isDate = type === "date";
  const baseClass = "w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition-colors focus:ring-2";
  const normalClass = `${baseClass} border-[#dce3ed] focus:border-[#1767b1] focus:ring-[#1767b1]/10`;
  const errorClass = `${baseClass} border-red-400 focus:border-red-500 focus:ring-red-500/10`;

  if (isDate) {
    return (
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#082b59]">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            placeholder="dd/mm/yyyy"
            maxLength={10}
            {...props}
            className={`${error ? errorClass : normalClass} pr-10`}
            onKeyDown={(e) => {
              if (!/[\d/]/.test(e.key) && e.key !== "Backspace" && e.key !== "Tab" && !e.key.startsWith("Arrow")) {
                e.preventDefault();
              }
            }}
            onInput={(e) => {
              const input = e.target as HTMLInputElement;
              let val = input.value.replace(/\D/g, "");
              if (val.length > 2) val = val.slice(0, 2) + "/" + val.slice(2);
              if (val.length > 5) val = val.slice(0, 5) + "/" + val.slice(5, 9);
              input.value = val;
              props.onChange?.({ ...e, target: input } as React.ChangeEvent<HTMLInputElement>);
            }}
          />
          <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#082b59]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        {...props}
        className={error ? errorClass : normalClass}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface InputRupiahProps {
  label: string;
  required?: boolean;
  error?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function InputRupiah({ label, required, error, value, onChange, placeholder }: InputRupiahProps) {
  const baseClass = "w-full rounded-xl border bg-white py-2.5 pl-10 pr-4 text-sm text-[#172033] outline-none transition-colors focus:ring-2";
  const normalClass = `${baseClass} border-[#dce3ed] focus:border-[#1767b1] focus:ring-[#1767b1]/10`;
  const errorClass = `${baseClass} border-red-400 focus:border-red-500 focus:ring-red-500/10`;

  function formatRupiah(v: string): string {
    const nums = v.replace(/\D/g, "");
    if (!nums) return "";
    return nums.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    onChange(raw);
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#082b59]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm text-slate-400">Rp</span>
        <input
          type="text"
          inputMode="numeric"
          value={formatRupiah(value)}
          onChange={handleChange}
          placeholder={placeholder || "0"}
          className={error ? errorClass : normalClass}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
