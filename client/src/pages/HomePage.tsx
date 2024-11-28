import Hero from "../components/Hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <Hero />

      <section className="py-12">
        <div className="container">
          <h2 className="text-3xl font-bold mb-8 text-center">Why Bitcoin Maximalism?</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sound Money</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Bitcoin is the hardest form of money ever created, immune to inflation and government control.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Freedom</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Take control of your financial future with true peer-to-peer digital cash.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Community</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Join a growing community of Bitcoiners in Peru and around the world.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12 bg-muted">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Bitcoin Mining in Peru</h2>
              <p className="text-lg mb-6">
                Learn about Bitcoin mining opportunities in Peru and how you can participate in securing the network.
              </p>
            </div>
            <div>
              <img
                src="https://images.unsplash.com/photo-1658225282648-b199eb2a4830"
                alt="Bitcoin Mining"
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
