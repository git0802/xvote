"use client";

import { AuthContext } from "@/components/auth-context";
import Poll from "@/components/poll";
import ProfPoll from "@/components/profPoll";
import { Button } from "@/components/ui/button";
import { deletePollById, getAllPollsByUsername, likePoll, updatePollResult } from "@/server/poll";
import { followUser, getUserByUsername } from "@/server/user";
import { Share2, Trash, UserMinus, UserPlus } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { toast } from "sonner";

export default function Page({ params }) {
    const [polls, setPolls] = useState([]);
    const user = useContext(AuthContext);
    const [loadingPolls, setLoadingPolls] = useState({});
    const [isFollowing, setIsFollowing] = useState([]);
    const [userId, setUserId] = useState(null);
    const updatePollInState = (updatedPoll) => {
        setPolls((prev) =>
            prev.map((p) => (p.id === updatedPoll.id ? updatedPoll : p))
        );
    };
    const handleShare = (title, id) => {
        try {
            window.navigator.share({
                title: title,
                text: title,
                url: `${window.location.origin}/${id}`,
            });
        }
        catch (e) {
            toast.error("Copied link to clipboard!");
            navigator.clipboard.writeText(`${window.location.origin}/${id}`);
        }
    }

    const handlePollClick = async (pollId, optionIndex) => {
        if (!user?.user?.id) return toast.error("You must be signed in to vote!");
        console.log("Voting on poll", pollId, "option", optionIndex);
        setLoadingPolls((prev) => ({ ...prev, [pollId]: true }));
        try {
            const req = await updatePollResult({ pollId, optionIndex, userId: user.user.id });
            const data = JSON.parse(req);
            if (!data.success) {
                toast.error(data.error);
            } else if (data.poll) {
                updatePollInState(data.poll);
            } else {
                await getPolls();
            }
        } catch (e) {
            console.log(e.message);
            toast.error(e.message);
        }
        setLoadingPolls((prev) => ({ ...prev, [pollId]: false }));
    };

    const handleLikeClick = async (pollId) => {
        if (!user?.user?.id) return toast.error("You must be signed in to like!");
        setLoadingPolls((prev) => ({ ...prev, [pollId]: true }));
        try {
            const req = await likePoll({ pollId, userId: user.user.id });
            const data = JSON.parse(req);
            if (!data.success) {
                toast.error(data.error);
            } else if (data.poll) {
                updatePollInState(data.poll);
            } else {
                await getPolls();
            }
        } catch (e) {
            console.log(e);
            toast.error(e.message);
        }
        setLoadingPolls((prev) => ({ ...prev, [pollId]: false }));
    };

    const getPolls = async () => {
        try {
            const req = await getAllPollsByUsername(decodeURIComponent(params.id).replace("@", ""));
            const data = JSON.parse(req);
            if (data.success) {
                setPolls(data.polls);
                console.log(data.polls);
            }
        } catch (e) {
            console.log(e);
        }
    };

    const handleFollow = async (e) => {
        e.target.disabled = true;
        try {
            const req = await followUser(userId);
            const data = JSON.parse(req);
            if (data.success) {
                getUser();
            }
            else {
                toast.error(data.error);
            }
        }
        catch (e) {
            console.log(e);
        }
        e.target.disabled = false;
    };
    const getUser = async () => {
        try {
            const req = await getUserByUsername(decodeURIComponent(params.id).replace("@", ""));
            const data = JSON.parse(req);
            if (data.success) {
                setUserId(data.user.id);
                setIsFollowing(data.user.followers);
            }
        }
        catch (e) {
            console.log(e);
        }
    };

    const handleDeletePoll = async (pollId) => {
        if (!user?.user?.id) return toast.error("You must be signed in to delete!");
        try {
            const req = await deletePollById(pollId);
            const data = JSON.parse(req);
            if (data.success) {
                await getPolls();
            }
            else {
                toast.error(data.error);
            }
        }
        catch (e) {
            console.log(e);
        }
    };

    useEffect(() => {
        getPolls();
        getUser();
    }, []);
    return (
        <main className="py-8">
            <div className="mb-12 md:rounded-md px-6 py-5 md:mx-20 lg:mx-32 bg-secondary/40 flex items-center justify-between">
                <div className="grid gap-1">
                    <h1 className="text-xl font-medium">{decodeURIComponent(params.id).replace("@", "")}</h1>
                    <div className="flex items-center gap-4">
                        <p className="text-sm text-foreground/80">Polls <span className="text-foreground font-medium text-lg">{polls?.length}</span></p>
                        <p className="text-sm text-foreground/80">Followers <span className="text-foreground font-medium text-lg">{isFollowing?.length || 0}</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" onClick={() => handleShare(decodeURIComponent(params.id).replace("@", ""), decodeURIComponent(params.id).replace("@", ""))}><Share2 className="h-4 w-4" /></Button>
                    <Button disabled={user?.user?.username === decodeURIComponent(params.id).replace("@", "")} onClick={handleFollow} size="icon">{isFollowing?.includes(user?.user?.id) ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}</Button>
                </div>
            </div>

            <div className="masonry px-6 md:px-20 lg:px-32 grid gap-5 sm:block">
                {polls
                    .slice()
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .map((poll) => {
                        const totalClicks = poll?.options?.filter(Boolean).reduce((acc, curr) => acc + curr.clicks, 0);
                        const userVoteIndex = poll?.clicks?.find((click) => click.userId === user?.user?.id)?.optionIndex;
                        return (
                            <ProfPoll
                                key={poll.id}
                                poll={poll}
                                loading={loadingPolls[poll.id] || false}
                                totalClicks={totalClicks}
                                userVoteIndex={userVoteIndex}
                                handlePollClick={handlePollClick}
                                handleLikeClick={handleLikeClick}
                                user={user}
                                titleClassName="text-base"
                                children={
                                    <div>
                                        <Trash className="h-4 w-4" onClick={() => handleDeletePoll(poll.id)} />
                                    </div>
                                }
                            />
                        );
                    })}
            </div>
            {polls.length <= 0 && (
                <div className="h-[300px] mx-6 md:mx-20 lg:mx-32 flex items-center justify-center border rounded-md border-border">
                    <p className="text-sm text-foreground/80">No polls published!</p>
                </div>
            )}
        </main>
    )
}