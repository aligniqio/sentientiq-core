import { jsx as _jsx } from "react/jsx-runtime";
export default function LogoCloud() {
    return (_jsx("section", { className: "section pb-12", children: _jsx("div", { className: "grid grid-cols-2 md:grid-cols-6 gap-6 opacity-70", children: Array.from({ length: 6 }).map((_, i) => (_jsx("div", { className: "h-10 rounded-md bg-white/5 border border-white/10" }, i))) }) }));
}
