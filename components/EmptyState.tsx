import CreateHabitDialog from "@/components/CreateHabitDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmptyState() {
  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">No habits yet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-center">
        <p className="text-sm text-muted-foreground">
          Start with one small habit and track it daily. Small wins build momentum.
        </p>
        <div className="flex justify-center">
          <CreateHabitDialog />
        </div>
      </CardContent>
    </Card>
  );
}
