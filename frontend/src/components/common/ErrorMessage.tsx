import { Card, CardContent, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";

type ErrorMessageProps = Readonly<{
  message: string;
}>;

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <Card
      sx={(theme) => ({
        borderLeft: `4px solid ${theme.palette.error.main}`,
        backgroundColor: alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.1 : 0.06),
      })}
    >
      <CardContent sx={{ py: "12px !important" }}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <ErrorOutlineIcon sx={{ color: "error.main", fontSize: 20, mt: 0.1, flexShrink: 0 }} />
          <Typography color="error" variant="body2">
            {message}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
