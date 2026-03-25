import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Menubar, MenubarMenu } from "@/components/ui/menubar";
import { cn } from "@/lib/utils";

export function Navigation() {
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const menuItems = [
        { name: "Home", to: "/" },
        { name: "Start Learning", to: "/learn" },
        { name: "Statistics", to: "/stats" },
    ];

    return (
        <>
            {isAuthenticated && (
                <div className="w-full flex items-center justify-center p-8 pt-4 font-semibold">
                    <Menubar className="h-fit text-large">
                        <MenubarMenu>
                            {menuItems.map((item) => {
                                return (
                                    <div
                                        key={item.to}
                                        className={cn(
                                            "border-r px-2 py-1 hover:bg-accent ",
                                            "hover:bg-accent px-2 py-1 rounded-md cursor-pointer",
                                            location.pathname === item.to
                                                ? "bg-green-900 hover:bg-green-900 text-white"
                                                : ""
                                        )}
                                    >
                                        <Link to={item.to}>{item.name}</Link>
                                    </div>
                                );
                            })}
                            <div className="hover:bg-accent p-1 rounded-md cursor-pointer">
                                <p onClick={handleLogout}>Logout</p>
                            </div>
                        </MenubarMenu>
                    </Menubar>
                </div>
            )}
        </>
    );
}
