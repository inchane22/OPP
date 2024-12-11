import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { z } from "zod";
import type { Business } from "@/db/schema";
import { Loader2 } from "lucide-react";

// Define validation schema
const businessFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "El nombre es muy largo"),
  description: z.string().min(1, "La descripción es requerida").max(500, "La descripción es muy larga"),
  address: z.string().min(1, "La dirección es requerida").max(200, "La dirección es muy larga"),
  city: z.string().min(1, "La ciudad es requerida").max(100, "La ciudad es muy larga"),
  phone: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')).refine((val) => {
    if (!val) return true;
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, "Debe ser una URL válida"),
  acceptsLightning: z.boolean()
});

type BusinessFormData = z.infer<typeof businessFormSchema>;

interface EditBusinessFormProps {
  business: Business;
  onSubmit: (data: BusinessFormData) => Promise<void>;
  isPending: boolean;
}

export function EditBusinessForm({ business, onSubmit, isPending }: EditBusinessFormProps) {
  const form = useForm<BusinessFormData>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: {
      name: business.name || '',
      description: business.description || '',
      address: business.address || '',
      city: business.city || '',
      phone: business.phone || '',
      website: business.website || '',
      acceptsLightning: business.acceptsLightning || false
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ciudad</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono (opcional)</FormLabel>
              <FormControl>
                <Input 
                  type="tel" 
                  {...field} 
                  value={field.value || ''} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sitio Web (opcional)</FormLabel>
              <FormControl>
                <Input 
                  type="url" 
                  {...field} 
                  value={field.value || ''} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="acceptsLightning"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel>Acepta Lightning Network</FormLabel>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : "Guardar Cambios"}
        </Button>
      </form>
    </Form>
  );
}
