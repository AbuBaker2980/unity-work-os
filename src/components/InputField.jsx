const InputField = ({ label, value, onChange, placeholder, type = "text" }) => (
    <div className="mb-5">
        <label className="block text-xs text-gray-500 mb-2 font-bold uppercase tracking-wide">
            {label}
        </label>
        <input
            type={type}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-white/10 p-3 rounded-xl text-sm text-gray-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-gray-700"
            placeholder={placeholder}
        />
    </div>
);

export default InputField;