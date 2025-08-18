import { FiBook } from 'react-icons/fi'
export default function LogoPotrait() {
    return (
        <div className="flex flex-col items-center gap-1">
            <FiBook size={38} />
            <div className="text-sm font-medium">Tadabbur AI</div>
        </div>
    )
}