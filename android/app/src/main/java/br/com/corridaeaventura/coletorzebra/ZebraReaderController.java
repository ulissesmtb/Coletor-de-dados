package br.com.corridaeaventura.coletorzebra;

import android.content.Context;
import com.zebra.rfid.api3.*;
import java.util.ArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

public final class ZebraReaderController implements RfidEventsListener {
    private final Context context;
    private final Consumer<String> status;
    private final Consumer<String> tag;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private Readers readers;
    private RFIDReader connected;
    private boolean inventoryRunning = false;

    public ZebraReaderController(Context context, Consumer<String> status, Consumer<String> tag) {
        this.context = context;
        this.status = status;
        this.tag = tag;
    }

    private void submit(Runnable action) {
        io.execute(() -> {
            try { action.run(); }
            catch (Exception ex) { status.accept("Erro Zebra: " + ex.getMessage()); }
        });
    }

    public void connect() {
        submit(() -> {
            if (connected != null && connected.isConnected()) { status.accept("Conectado"); return; }
            readers = new Readers(context, ENUM_TRANSPORT.BLUETOOTH);
            ArrayList<ReaderDevice> devices = readers.GetAvailableRFIDReaderList();
            if (devices == null || devices.isEmpty()) {
                status.accept("Nenhum leitor RFID pareado disponível"); return;
            }
            // Initial implementation uses first paired RFID reader. Device selector is a future enhancement.
            connected = devices.get(0).getRFIDReader();
            connected.connect();
            connected.Events.addEventsListener(this);
            connected.Events.setTagReadEvent(true);
            connected.Events.setReaderDisconnectEvent(true);
            status.accept("Conectado");
        });
    }

    public void start() {
        submit(() -> {
            if (connected == null || !connected.isConnected()) {
                status.accept("Conecte o leitor antes de iniciar"); return;
            }
            if (!inventoryRunning) {
                connected.Actions.Inventory.perform();
                inventoryRunning = true;
                status.accept("Lendo etiquetas");
            }
        });
    }

    public void stop() {
        submit(() -> {
            if (connected != null && connected.isConnected() && inventoryRunning) {
                connected.Actions.Inventory.stop();
                inventoryRunning = false;
            }
            status.accept("Leitura parada");
        });
    }

    public void disconnect() {
        submit(() -> {
            if (connected != null) {
                if (inventoryRunning) connected.Actions.Inventory.stop();
                inventoryRunning = false;
                connected.disconnect();
                connected = null;
            }
            if (readers != null) { readers.Dispose(); readers = null; }
            status.accept("Desconectado");
        });
    }

    @Override public void eventReadNotify(RfidReadEvents event) {
        RFIDReader r = connected;
        if (r == null) return;
        TagData[] tags = r.Actions.getReadTags(100);
        if (tags == null) return;
        for (TagData value : tags) {
            String id = value.getTagID();
            // SAFETY: never convert an ordinary hex EPC into a decimal athlete ID.
            // Real chip must be checked to establish EPC versus USER data source.
            if (id != null && id.matches("[0-9]{16}")) tag.accept(id);
            else status.accept("Etiqueta ignorada: ID diferente de 16 dígitos decimais");
        }
    }

    @Override public void eventStatusNotify(RfidStatusEvents event) {
        if (event.StatusEventData.getStatusEventType() == STATUS_EVENT_TYPE.DISCONNECTION_EVENT) {
            inventoryRunning = false;
            status.accept("Conexão Zebra perdida");
        }
    }

    public void dispose() {
        try {
            io.execute(() -> {
                try {
                    if (connected != null) connected.disconnect();
                    if (readers != null) readers.Dispose();
                } catch (Exception ignored) {}
            });
        } catch (Exception ignored) {}
        io.shutdown();
    }
}
