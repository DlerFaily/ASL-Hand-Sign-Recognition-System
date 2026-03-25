import apiClient from "@/cfg/api";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export function Home() {
    const [isStaff, setIsStaff] = useState<boolean>(false);

    useEffect(() => {
        apiClient
        .get("/api/users/is_staff")
        .then((resp) => {
            setIsStaff(resp.data.is_staff);
        })
        .catch((err) => console.log(err));
    }, []);

    return (
        <div>
            <h1>Welcome!</h1>
            <p>Please select one of the options above.</p>
            <p></p>
            <nav>
                {isStaff && (
                    <Link to="/admin" className="underline">
                        Go to Admin Dashboard
                    </Link>
                )}
            </nav>
        </div>
    );
}
