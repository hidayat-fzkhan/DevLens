import { useState } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloseIcon from "@mui/icons-material/Close";
import type { ApiAttachment } from "../../types";

type AttachmentsProps = Readonly<{
  attachments: ApiAttachment[];
}>;

function attachmentSrc(att: ApiAttachment): string {
  const params = new URLSearchParams();
  if (att.name) params.set("name", att.name);
  const qs = params.toString();
  return `/api/attachments/${att.id}${qs ? `?${qs}` : ""}`;
}

function formatBytes(bytes?: number): string | undefined {
  if (bytes === undefined) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function Attachments({ attachments }: AttachmentsProps) {
  const [zoomed, setZoomed] = useState<ApiAttachment | null>(null);

  if (attachments.length === 0) return null;

  const images = attachments.filter((a) => a.isImage);
  const files = attachments.filter((a) => !a.isImage);

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
        <AttachFileOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
          Attachments · {attachments.length}
        </Typography>
      </Stack>

      {images.length > 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)" },
            gap: 1,
            mb: files.length > 0 ? 1.5 : 0,
          }}
        >
          {images.map((att) => (
            <Tooltip key={att.id} title={att.name}>
              <Box
                onClick={() => setZoomed(att)}
                sx={(theme) => ({
                  position: "relative",
                  cursor: "zoom-in",
                  borderRadius: 1,
                  overflow: "hidden",
                  border: `1px solid ${theme.palette.border.default}`,
                  aspectRatio: "4 / 3",
                  backgroundColor: theme.palette.background.default,
                  transition: "border-color 0.15s",
                  "&:hover": { borderColor: theme.palette.primary.main },
                })}
              >
                <Box
                  component="img"
                  src={attachmentSrc(att)}
                  alt={att.name}
                  loading="lazy"
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </Box>
            </Tooltip>
          ))}
        </Box>
      )}

      {files.length > 0 && (
        <Stack spacing={0.5}>
          {files.map((att) => {
            const sizeLabel = formatBytes(att.size);
            return (
              <Stack
                key={att.id}
                direction="row"
                alignItems="center"
                spacing={1}
                sx={(theme) => ({
                  p: 0.75,
                  border: `1px solid ${theme.palette.border.muted}`,
                  borderRadius: 0.75,
                })}
              >
                <InsertDriveFileOutlinedIcon
                  sx={{ fontSize: 16, color: "text.secondary" }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    component="a"
                    href={attachmentSrc(att)}
                    target="_blank"
                    rel="noreferrer"
                    variant="body2"
                    sx={{
                      color: "primary.main",
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {att.name}
                  </Typography>
                </Box>
                {sizeLabel && (
                  <Typography variant="caption" color="text.disabled">
                    {sizeLabel}
                  </Typography>
                )}
              </Stack>
            );
          })}
        </Stack>
      )}

      <Dialog
        open={Boolean(zoomed)}
        onClose={() => setZoomed(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { backgroundColor: "background.default" } }}
      >
        <DialogContent sx={{ p: 1.5, position: "relative" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography
              variant="body2"
              sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {zoomed?.name}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              {zoomed && (
                <Tooltip title="Open in new tab">
                  <IconButton
                    size="small"
                    component="a"
                    href={attachmentSrc(zoomed)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <IconButton size="small" onClick={() => setZoomed(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
          {zoomed && (
            <Box
              component="img"
              src={attachmentSrc(zoomed)}
              alt={zoomed.name}
              sx={{
                width: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
                display: "block",
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
