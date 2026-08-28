interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string;
}

export function Input({ label, required, error, ...props }: InputProps) {
  const baseClass = "w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition-colors focus:ring-2";
  const normalClass = `${baseClass} border-[#dce3ed] focus:border-[#1767b1] focus:ring-[#1767b1]/10`;
  const errorClass = `${baseClass} border-red-400 focus:border-red-500 focus:ring-red-500/10`;

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#082b59]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
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
